const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Configurar entorno aislado de pruebas antes de cargar módulos de la aplicación
const TEST_PG_DIR = path.resolve(process.cwd(), '.pgdata-test');
process.env.NODE_ENV = 'test';
process.env.USE_EMBEDDED_PG = 'true';
process.env.PG_DATA_DIR = './.pgdata-test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_isolated_2026';
process.env.JWT_EXPIRES_IN = '2h';
process.env.ADMIN_NOMBRE = 'Admin Pruebas';
process.env.ADMIN_CORREO = 'admin.test@catalogo.local';
process.env.ADMIN_PASSWORD = 'AdminTest123*';

const app = require('../src/app');
const db = require('../src/config/db');
const { inicializarBaseDeDatos } = require('../src/database/init');

function limpiarDirectorioPruebas() {
  if (fs.existsSync(TEST_PG_DIR)) {
    fs.rmSync(TEST_PG_DIR, { recursive: true, force: true });
  }
}

async function request(baseUrl, endpoint, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  return { status: response.status, data: json };
}

function iniciarHttp(expressApp) {
  return new Promise((resolve) => {
    const server = expressApp.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}/api` });
    });
  });
}

function cerrarHttp(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function ejecutarPruebas() {
  let resultados = [];
  const registrar = (nombre) => {
    resultados.push(nombre);
    console.log(`  [OK] ${nombre}`);
  };

  limpiarDirectorioPruebas();

  let server;
  let baseUrl;

  try {
    console.log('=== Iniciando suite reproducible de pruebas de la API ===\n');

    await inicializarBaseDeDatos({ silent: true });
    ({ server, baseUrl } = await iniciarHttp(app));

    // 1. Catálogo público inicial
    const resCatalogo = await request(baseUrl, '/productos');
    assert.equal(resCatalogo.status, 200);
    assert.ok(resCatalogo.data.productos.length >= 6, 'Debe tener al menos 6 productos semilla');
    registrar('GET /api/productos público retorna catálogo con >= 6 productos (200)');

    const resFiltro = await request(baseUrl, '/productos?categoria=Electrónica');
    assert.equal(resFiltro.status, 200);
    assert.ok(resFiltro.data.productos.length >= 1);
    assert.ok(resFiltro.data.productos.every((p) => p.categoria === 'Electrónica'));
    registrar('GET /api/productos?categoria=Electrónica filtra correctamente (200)');

    const productoBaseId = resCatalogo.data.productos[0].id;
    const resDetalle = await request(baseUrl, `/productos/${productoBaseId}`);
    assert.equal(resDetalle.status, 200);
    assert.equal(resDetalle.data.producto.id, productoBaseId);
    registrar('GET /api/productos/:id consulta un producto existente (200)');

    const resInexistente = await request(baseUrl, '/productos/99999');
    assert.equal(resInexistente.status, 404);
    registrar('GET /api/productos/99999 rechaza producto inexistente (404)');

    const resIdInvalido = await request(baseUrl, '/productos/abc');
    assert.equal(resIdInvalido.status, 400);
    registrar('GET /api/productos/abc rechaza identificador inválido (400)');

    // 2. Registro público y restricciones de rol
    const resRegA = await request(baseUrl, '/auth/registro', {
      method: 'POST',
      body: {
        nombre: 'Usuario A',
        correo: 'usuario.a@ejemplo.local',
        password: 'Password123',
      },
    });
    assert.equal(resRegA.status, 201);
    assert.equal(resRegA.data.usuario.rol, 'usuario');
    assert.equal(resRegA.data.usuario.password, undefined);
    assert.equal(resRegA.data.usuario.password_hash, undefined);
    const usuarioAId = resRegA.data.usuario.id;
    registrar('POST /api/auth/registro crea usuario normal sin exponer password_hash (201)');

    const resRegB = await request(baseUrl, '/auth/registro', {
      method: 'POST',
      body: {
        nombre: 'Usuario B',
        correo: 'usuario.b@ejemplo.local',
        password: 'Password123',
        rol: 'admin',
      },
    });
    assert.equal(resRegB.status, 201);
    assert.equal(resRegB.data.usuario.rol, 'usuario');
    registrar('POST /api/auth/registro ignora intento de rol admin y asigna usuario (201)');

    const resRegDup = await request(baseUrl, '/auth/registro', {
      method: 'POST',
      body: {
        nombre: 'Usuario Duplicado',
        correo: 'usuario.a@ejemplo.local',
        password: 'Password123',
      },
    });
    assert.equal(resRegDup.status, 409);
    registrar('POST /api/auth/registro rechaza correo duplicado (409)');

    const resRegInvalido = await request(baseUrl, '/auth/registro', {
      method: 'POST',
      body: { nombre: '', correo: 'no-es-correo', password: '123' },
    });
    assert.equal(resRegInvalido.status, 400);
    registrar('POST /api/auth/registro rechaza datos inválidos (400)');

    // 3. Login y emisión de JWT
    const resLoginAdmin = await request(baseUrl, '/auth/login', {
      method: 'POST',
      body: {
        correo: process.env.ADMIN_CORREO,
        password: process.env.ADMIN_PASSWORD,
      },
    });
    assert.equal(resLoginAdmin.status, 200);
    assert.equal(resLoginAdmin.data.usuario.rol, 'admin');
    assert.ok(resLoginAdmin.data.token);
    const adminToken = resLoginAdmin.data.token;
    registrar('POST /api/auth/login autentica administrador y emite JWT (200)');

    const resLoginA = await request(baseUrl, '/auth/login', {
      method: 'POST',
      body: { correo: 'usuario.a@ejemplo.local', password: 'Password123' },
    });
    assert.equal(resLoginA.status, 200);
    const userAToken = resLoginA.data.token;

    const resLoginB = await request(baseUrl, '/auth/login', {
      method: 'POST',
      body: { correo: 'usuario.b@ejemplo.local', password: 'Password123' },
    });
    assert.equal(resLoginB.status, 200);
    const userBToken = resLoginB.data.token;
    registrar('POST /api/auth/login autentica Usuarios A y B (200)');

    const resLoginMal = await request(baseUrl, '/auth/login', {
      method: 'POST',
      body: { correo: 'usuario.a@ejemplo.local', password: 'Incorrecta' },
    });
    assert.equal(resLoginMal.status, 401);
    assert.equal(resLoginMal.data.token, undefined);
    registrar('POST /api/auth/login rechaza credenciales incorrectas (401)');

    const resLoginExpirado = await request(baseUrl, '/auth/login', {
      method: 'POST',
      body: {
        correo: 'usuario.a@ejemplo.local',
        password: 'Password123',
        expirado: true,
      },
    });
    assert.equal(resLoginExpirado.status, 200);
    const expiredToken = resLoginExpirado.data.token;

    // 4. Seguridad JWT y Control de Roles
    const resSinToken = await request(baseUrl, '/favoritos');
    assert.equal(resSinToken.status, 401);
    registrar('GET /api/favoritos sin token responde 401');

    const resTokenVencido = await request(baseUrl, '/favoritos', {
      token: expiredToken,
    });
    assert.equal(resTokenVencido.status, 401);
    registrar('GET /api/favoritos con token vencido responde 401');

    const resTokenFirmaInvalida = await request(baseUrl, '/favoritos', {
      token: `${userAToken}alterado`,
    });
    assert.equal(resTokenFirmaInvalida.status, 401);
    registrar('GET /api/favoritos con firma alterada responde 401');

    const resUserCreaProd = await request(baseUrl, '/productos', {
      method: 'POST',
      token: userAToken,
      body: {
        nombre: 'No Permitido',
        descripcion: 'Intento de usuario normal',
        categoria: 'Audio',
        precio: 25,
      },
    });
    assert.equal(resUserCreaProd.status, 403);
    registrar('POST /api/productos con rol usuario responde 403');

    // 5. CRUD Admin + Validaciones de producto
    const resPrecioInvalido = await request(baseUrl, '/productos', {
      method: 'POST',
      token: adminToken,
      body: {
        nombre: 'Producto Inválido',
        descripcion: 'Precio cero o negativo',
        categoria: 'Hogar',
        precio: -10,
      },
    });
    assert.equal(resPrecioInvalido.status, 400);
    registrar('POST /api/productos con precio <= 0 rechaza con 400');

    const resCamposVacios = await request(baseUrl, '/productos', {
      method: 'POST',
      token: adminToken,
      body: { nombre: '', descripcion: '', categoria: '', precio: 0 },
    });
    assert.equal(resCamposVacios.status, 400);
    registrar('POST /api/productos con campos vacíos rechaza con 400');

    const resCrearProd = await request(baseUrl, '/productos', {
      method: 'POST',
      token: adminToken,
      body: {
        nombre: 'Webcam 4K',
        descripcion: 'Cámara web ultra HD con micrófono dual integrado.',
        categoria: 'Electrónica',
        precio: 120.5,
      },
    });
    assert.equal(resCrearProd.status, 201);
    const prodCreadoId = resCrearProd.data.producto.id;
    registrar('POST /api/productos como admin crea producto (201)');

    const resActualizarProd = await request(baseUrl, `/productos/${prodCreadoId}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        nombre: 'Webcam 4K Pro',
        descripcion: 'Cámara web ultra HD actualizada con enfoque automático.',
        categoria: 'Electrónica',
        precio: 135,
      },
    });
    assert.equal(resActualizarProd.status, 200);
    assert.equal(resActualizarProd.data.producto.precio, 135);
    registrar('PUT /api/productos/:id como admin actualiza producto (200)');

    const resUserUpdProd = await request(baseUrl, `/productos/${prodCreadoId}`, {
      method: 'PUT',
      token: userAToken,
      body: {
        nombre: 'Hack',
        descripcion: 'Intento',
        categoria: 'Electrónica',
        precio: 1,
      },
    });
    assert.equal(resUserUpdProd.status, 403);

    const resUserDelProd = await request(baseUrl, `/productos/${prodCreadoId}`, {
      method: 'DELETE',
      token: userAToken,
    });
    assert.equal(resUserDelProd.status, 403);
    registrar('PUT y DELETE /api/productos/:id con rol usuario responden 403');

    // 6. Favoritos, errores 409/404 y aislamiento entre A y B
    const resFavAddA = await request(baseUrl, '/favoritos', {
      method: 'POST',
      token: userAToken,
      body: { productoId: prodCreadoId, usuarioId: 99999 },
    });
    assert.equal(resFavAddA.status, 201);
    assert.equal(resFavAddA.data.favorito.usuario_id, usuarioAId);
    registrar('POST /api/favoritos usa identidad del JWT e ignora usuarioId del cliente (201)');

    const resFavDup = await request(baseUrl, '/favoritos', {
      method: 'POST',
      token: userAToken,
      body: { productoId: prodCreadoId },
    });
    assert.equal(resFavDup.status, 409);
    registrar('POST /api/favoritos rechaza favorito duplicado (409)');

    const resFavInexistente = await request(baseUrl, '/favoritos', {
      method: 'POST',
      token: userAToken,
      body: { productoId: 99999 },
    });
    assert.equal(resFavInexistente.status, 404);
    registrar('POST /api/favoritos rechaza producto inexistente (404)');

    const resFavListB = await request(baseUrl, '/favoritos', {
      token: userBToken,
    });
    assert.equal(resFavListB.status, 200);
    assert.equal(resFavListB.data.favoritos.length, 0);
    registrar('Aislamiento: Usuario B no ve los favoritos de Usuario A (200)');

    const resFavDelB = await request(baseUrl, `/favoritos/${prodCreadoId}`, {
      method: 'DELETE',
      token: userBToken,
    });
    assert.equal(resFavDelB.status, 404);
    registrar('Aislamiento: Usuario B no puede eliminar favorito de Usuario A (404)');

    const resFavListA = await request(baseUrl, '/favoritos', {
      token: userAToken,
    });
    assert.equal(resFavListA.status, 200);
    assert.ok(resFavListA.data.favoritos.some((f) => f.producto_id === prodCreadoId));
    registrar('Aislamiento: Favorito de Usuario A permanece intacto tras intento de B (200)');

    // Usuario A agrega un producto base (para probar persistencia) y elimina otro
    const resFavBaseA = await request(baseUrl, '/favoritos', {
      method: 'POST',
      token: userAToken,
      body: { productoId: productoBaseId },
    });
    assert.equal(resFavBaseA.status, 201);

    // Admin elimina el producto temporal creado y verificamos limpieza en cascada
    const resDelProd = await request(baseUrl, `/productos/${prodCreadoId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(resDelProd.status, 200);

    const resFavTrasDelProd = await request(baseUrl, '/favoritos', {
      token: userAToken,
    });
    assert.equal(resFavTrasDelProd.status, 200);
    assert.equal(
      resFavTrasDelProd.data.favoritos.some((f) => f.producto_id === prodCreadoId),
      false
    );
    assert.equal(
      resFavTrasDelProd.data.favoritos.some((f) => f.producto_id === productoBaseId),
      true
    );
    registrar('DELETE /api/productos/:id limpia favoritos en cascada manteniendo integridad (200)');

    // Usuario A prueba eliminar su favorito base y luego lo vuelve a guardar para persistencia
    const resFavDelA = await request(baseUrl, `/favoritos/${productoBaseId}`, {
      method: 'DELETE',
      token: userAToken,
    });
    assert.equal(resFavDelA.status, 200);

    const resFavGuardarPersistencia = await request(baseUrl, '/favoritos', {
      method: 'POST',
      token: userAToken,
      body: { productoId: productoBaseId },
    });
    assert.equal(resFavGuardarPersistencia.status, 201);
    registrar('DELETE /api/favoritos/:productoId elimina favorito propio correctamente (200)');

    // 7. Reinicio completo de servidor HTTP y conexión de base de datos para probar persistencia en disco
    await cerrarHttp(server);
    await db.close();

    await inicializarBaseDeDatos({ silent: true });
    ({ server, baseUrl } = await iniciarHttp(app));

    const resLoginPostReinicio = await request(baseUrl, '/auth/login', {
      method: 'POST',
      body: { correo: 'usuario.a@ejemplo.local', password: 'Password123' },
    });
    assert.equal(resLoginPostReinicio.status, 200);

    const resCatalogoPostReinicio = await request(baseUrl, '/productos');
    assert.equal(resCatalogoPostReinicio.status, 200);
    assert.ok(resCatalogoPostReinicio.data.productos.length >= 6);

    const resFavPostReinicio = await request(baseUrl, '/favoritos', {
      token: resLoginPostReinicio.data.token,
    });
    assert.equal(resFavPostReinicio.status, 200);
    assert.ok(
      resFavPostReinicio.data.favoritos.some((f) => f.producto_id === productoBaseId)
    );
    registrar('Persistencia tras reinicio de servidor y base de datos verificada (200)');

    console.log(`\n=== TODAS LAS PRUEBAS PASARON (${resultados.length}/${resultados.length}) ===`);
  } finally {
    if (server) {
      await cerrarHttp(server).catch(() => {});
    }
    await db.close().catch(() => {});
    limpiarDirectorioPruebas();
  }
}

ejecutarPruebas().catch((err) => {
  console.error('\n[FALLO EN PRUEBAS]', err);
  process.exit(1);
});

