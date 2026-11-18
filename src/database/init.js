const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

require('dotenv').config();

const PRODUCTOS_SEMILLA = [
  {
    nombre: 'Laptop Pro 14',
    descripcion: 'Computadora portátil de 14 pulgadas con 16 GB de RAM y SSD de 512 GB.',
    categoria: 'Electrónica',
    precio: 1150.0,
  },
  {
    nombre: 'Monitor IPS 27 Pulgadas',
    descripcion: 'Monitor QHD antirreflejo con tasa de refresco de 100 Hz y soporte ergonómico.',
    categoria: 'Electrónica',
    precio: 329.99,
  },
  {
    nombre: 'Teclado Mecánico Inalámbrico',
    descripcion: 'Teclado compacto 75% con switches táctiles silenciosos y conectividad Bluetooth.',
    categoria: 'Accesorios',
    precio: 89.5,
  },
  {
    nombre: 'Mouse Ergonómico Vertical',
    descripcion: 'Mouse inalámbrico recargable diseñado para reducir la fatiga de muñeca.',
    categoria: 'Accesorios',
    precio: 45.0,
  },
  {
    nombre: 'Audífonos Studio ANC',
    descripcion: 'Audífonos inalámbricos circumaurales con cancelación activa de ruido.',
    categoria: 'Audio',
    precio: 149.9,
  },
  {
    nombre: 'Lámpara LED de Escritorio',
    descripcion: 'Lámpara regulable con temperatura de color ajustable y puerto de carga USB.',
    categoria: 'Hogar',
    precio: 38.75,
  },
];

/**
 * Inicializa las tablas en PostgreSQL, asegura la existencia del usuario administrador
 * y carga al menos 6 productos de ejemplo si el catálogo está vacío.
 *
 * @param {{ silent?: boolean }} [options]
 * @returns {Promise<{ adminCreado: boolean, productosInsertados: number }>}
 */
async function inicializarBaseDeDatos({ silent = false } = {}) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schemaSql);

  const adminNombre = process.env.ADMIN_NOMBRE || 'Administrador UNEMI';
  const adminCorreo = (process.env.ADMIN_CORREO || 'admin@unemi.edu.ec')
    .trim()
    .toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123*';

  const existente = await db.query(
    'SELECT id, correo, rol FROM usuarios WHERE LOWER(correo) = LOWER($1)',
    [adminCorreo]
  );

  let adminCreado = false;
  if (existente.rows.length === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.query(
      'INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES ($1, $2, $3, $4)',
      [adminNombre, adminCorreo, passwordHash, 'admin']
    );
    adminCreado = true;
  } else if (existente.rows[0].rol !== 'admin') {
    await db.query('UPDATE usuarios SET rol = $1 WHERE id = $2', [
      'admin',
      existente.rows[0].id,
    ]);
  }

  const conteoProductos = await db.query(
    'SELECT COUNT(*)::int AS total FROM productos'
  );
  const totalActual = conteoProductos.rows[0]?.total ?? 0;

  let productosInsertados = 0;
  if (totalActual === 0) {
    for (const producto of PRODUCTOS_SEMILLA) {
      await db.query(
        'INSERT INTO productos (nombre, descripcion, categoria, precio) VALUES ($1, $2, $3, $4)',
        [
          producto.nombre,
          producto.descripcion,
          producto.categoria,
          producto.precio,
        ]
      );
      productosInsertados += 1;
    }
  }

  if (!silent) {
    console.log(`[DB] Esquema verificado (${db.getEngineName()}).`);
    console.log(
      adminCreado
        ? `[DB] Usuario administrador inicializado: ${adminCorreo}`
        : `[DB] Usuario administrador ya existente: ${adminCorreo}`
    );
    console.log(
      productosInsertados > 0
        ? `[DB] Se insertaron ${productosInsertados} productos de ejemplo.`
        : `[DB] Catálogo existente con ${totalActual} productos.`
    );
  }

  return { adminCreado, productosInsertados };
}

if (require.main === module) {
  inicializarBaseDeDatos()
    .then(async () => {
      await db.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[DB] Error al inicializar la base de datos:', err.message);
      await db.close();
      process.exit(1);
    });
}

module.exports = {
  inicializarBaseDeDatos,
  PRODUCTOS_SEMILLA,
};

