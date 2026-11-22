# API REST: Catálogo de Productos y Favoritos con Roles (JWT + PostgreSQL)

API REST desarrollada con **Node.js** y **Express** para gestionar un catálogo de productos y listas personales de favoritos, incorporando persistencia en **PostgreSQL**, autenticación mediante **JSON Web Tokens (JWT)** con expiración y autorización basada en roles (**RBAC**: `usuario` y `admin`).

---

## Autor

- **Estudiante:** Francisco Arias (`fariasp2@unemi.edu.ec`)

---

## Propósito

Proveer una API REST modular, segura y verificable que separe explícitamente **rutas**, **middlewares**, **controladores** y **repositorios de acceso a datos**, permitiendo:
- Consulta pública del catálogo de productos y filtrado por categoría.
- Registro público restringido exclusivamente al rol `usuario` e inicio de sesión con contraseña cifrada (`bcryptjs`) y emisión de token JWT firmado con expiración.
- Operaciones administrativas (`POST`, `PUT`, `DELETE` sobre productos) reservadas únicamente para el rol `admin`.
- Gestión aislada de favoritos personales donde la identidad del usuario se obtiene exclusivamente del JWT verificado, garantizando que ningún usuario pueda ver ni modificar los favoritos de otro.

---

## Elección de Base de Datos y Justificación

Se seleccionó **PostgreSQL** (usando el controlador oficial `pg` con consultas SQL parametrizadas `$1, $2, ...` y soporte opcional embebido persistente en disco con `@electric-sql/pglite` para ejecución reproducible sin servicios externos).

**Justificación técnica:**
1. **Integridad referencial estricta:** El dominio relaciona `usuarios`, `productos` y `favoritos` mediante claves foráneas (`FOREIGN KEY`).
2. **Prevención de duplicados y datos inválidos en motor:**
   - Unicidad de correo en `usuarios` (`UNIQUE`).
   - Restricción `CHECK (precio > 0)` en `productos` y `CHECK (rol IN ('usuario', 'admin'))` en `usuarios`.
   - Restricción compuesta `CONSTRAINT uq_usuario_producto UNIQUE (usuario_id, producto_id)` en `favoritos` para impedir duplicados.
3. **Consistencia al eliminar productos:** Se definió `ON DELETE CASCADE` sobre `favoritos.producto_id` (y `favoritos.usuario_id`). De este modo, si el administrador elimina un producto del catálogo, sus asociaciones en `favoritos` se eliminan automáticamente manteniendo la base de datos libre de referencias huérfanas.
4. **Seguridad:** Todas las consultas emplean marcadores posicionales (`$1`, `$2`, ...) evitando cualquier riesgo de inyección SQL.

---

## Estructura del Proyecto

```text
S10-TAREA_2/
├── .env.example                  # Plantilla de variables de entorno (sin secretos reales)
├── .gitignore                    # Exclusión de node_modules, .env y datos locales
├── package.json                  # Dependencias y scripts NPM
├── package-lock.json             # Árbol exacto de dependencias
├── README.md                     # Documentación principal del proyecto
├── postman/
│   ├── Catalogo_Productos_Favoritos.postman_collection.json
│   └── Catalogo_Local.postman_environment.json
├── scripts/
│   └── test-api.js               # Suite automatizada end-to-end (30 casos + persistencia)
└── src/
    ├── app.js                    # Configuración de Express, CORS, JSON y montaje de rutas
    ├── server.js                 # Arranque del servidor HTTP e inicialización de BD
    ├── config/
    │   └── db.js                 # Adaptador PostgreSQL (pg.Pool o PGlite persistente en disco)
    ├── database/
    │   ├── schema.sql            # Script DDL de tablas, restricciones e índices
    │   └── init.js               # Script de inicialización de esquema, admin y 6 productos semilla
    ├── repositories/
    │   ├── usuario.repository.js # Acceso a datos de usuarios (consultas parametrizadas)
    │   ├── producto.repository.js# Acceso a datos de productos y filtro por categoría
    │   └── favorito.repository.js# Acceso a datos de favoritos aislado por usuario_id
    ├── middlewares/
    │   ├── auth.middleware.js    # Verificación de JWT (firma/expiración) y control de roles
    │   ├── validacion.middleware.js # Validación de entradas y parámetros de ruta
    │   └── error.middleware.js   # Manejo centralizado de 404 y errores sin exponer secretos
    ├── controllers/
    │   ├── auth.controller.js    # Registro público y login con emisión de JWT
    │   ├── producto.controller.js# Lógica CRUD de productos
    │   └── favorito.controller.js# Lógica de favoritos del usuario autenticado
    └── routes/
        ├── index.js              # Enrutador principal
        ├── auth.routes.js        # /auth
        ├── producto.routes.js    # /productos
        └── favorito.routes.js    # /favoritos
```

---

## Requisitos Previos

- **Node.js** `v18.x` o superior (probado en `v24.21.0`).
- **NPM** `v9.x` o superior.
- **Postman** (para importar y ejecutar la colección de pruebas).
- *(Opcional)* **PostgreSQL 15/16** si desea conectar un servidor externo modificando `USE_EMBEDDED_PG=false` en `.env`. Por defecto el proyecto incluye un motor PostgreSQL embebido persistente en disco (`./.pgdata`) para funcionar desde una copia limpia sin configuraciones adicionales.

---

## Instalación desde Copia Limpia

1. **Clonar el repositorio e ingresar al directorio:**
   ```bash
   git clone https://github.com/FranciscoArias10/S10-TAREA_2.git
   cd S10-TAREA_2
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copie `.env.example` a `.env` y defina sus valores locales (especialmente `JWT_SECRET` y `ADMIN_PASSWORD`):
   ```bash
   cp .env.example .env
   ```
   *(En Windows PowerShell: `Copy-Item .env.example .env`)*.

---

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto HTTP donde escucha Express | `3000` |
| `NODE_ENV` | Entorno de ejecución (`development`, `production`, `test`) | `development` |
| `USE_EMBEDDED_PG` | `true` usa PostgreSQL embebido persistente en disco; `false` usa servidor externo vía `pg.Pool` | `true` |
| `PG_DATA_DIR` | Carpeta local de almacenamiento persistente cuando `USE_EMBEDDED_PG=true` | `./.pgdata` |
| `DATABASE_URL` | Cadena de conexión PostgreSQL estándar cuando `USE_EMBEDDED_PG=false` | `postgresql://usuario:password@localhost:5432/catalogo_db` |
| `DB_SSL` | Habilita SSL para conexiones PostgreSQL en la nube (`true` o `false`) | `false` |
| `JWT_SECRET` | Clave secreta para firmar y verificar tokens JWT (nunca subir a Git) | `REEMPLAZAR_CON_SECRETO_JWT_SEGURO` |
| `JWT_EXPIRES_IN` | Tiempo de vida del token JWT (ej. `2h`, `30m`, `1d`) | `2h` |
| `ADMIN_NOMBRE` | Nombre completo del usuario administrador inicial | `Administrador Principal` |
| `ADMIN_CORREO` | Correo del usuario administrador creado por `db:init` | `admin@catalogo.local` |
| `ADMIN_PASSWORD` | Contraseña en texto plano usada únicamente por `db:init` para generar el hash en BD | `REEMPLAZAR_CON_PASSWORD_ADMIN` |

---

## Inicialización de Datos y del Administrador

El rol `admin` **no puede obtenerse** mediante el endpoint público `POST /api/auth/registro`. Se crea exclusivamente de forma local mediante el script de inicialización:

```bash
npm run db:init
```

Este comando ejecuta `src/database/init.js`, el cual:
1. Aplica `src/database/schema.sql` creando las tablas `usuarios`, `productos` y `favoritos`.
2. Crea el usuario administrador configurado en `.env` (`ADMIN_NOMBRE`, `ADMIN_CORREO`, `ADMIN_PASSWORD`) almacenando su contraseña como hash `bcrypt` (10 rondas).
3. Inserta **6 productos de ejemplo** en categorías como `Electrónica`, `Accesorios`, `Audio` y `Hogar` si el catálogo está vacío.

*(Si desea usar PostgreSQL externo en lugar de embebido, cree primero la base de datos vacía en PostgreSQL, configure `USE_EMBEDDED_PG=false` y `DATABASE_URL` en `.env`, y luego ejecute `npm run db:init`).*

---

## Comandos de Ejecución

```bash
# Inicializar esquema, usuario admin y datos de ejemplo
npm run db:init

# Iniciar servidor en producción/normal (también inicializa BD si está vacía)
npm start

# Iniciar servidor en modo desarrollo con recarga automática
npm run dev

# Ejecutar la suite automatizada de pruebas (incluye reinicio del servidor)
npm test
```

La API quedará disponible tanto bajo el prefijo **`http://localhost:3000/api`** como directamente en `http://localhost:3000`.

---

## Documentación de Rutas y Criterio de Códigos de Estado

### Criterio de Códigos HTTP
- **`200 OK`**: Consultas (`GET`), inicio de sesión (`POST /auth/login`), actualizaciones (`PUT`) y eliminaciones (`DELETE`) exitosas.
- **`201 Created`**: Creación exitosa de usuarios (`POST /auth/registro`), productos (`POST /productos`) y favoritos (`POST /favoritos`).
- **`400 Bad Request`**: Datos de entrada sintáctica o estructuralmente inválidos (campos obligatorios vacíos, formato de correo inválido, precio `<= 0` o no numérico, identificadores de ruta o cuerpo que no sean enteros positivos, o JSON malformado). Se eligió `400` de forma uniforme para validaciones de formato/rango de entrada en lugar de mezclar `422`.
- **`401 Unauthorized`**: Ausencia de cabecera `Authorization: Bearer <token>`, firma JWT inválida, token vencido (`TokenExpiredError`) o credenciales incorrectas en login.
- **`403 Forbidden`**: Token válido perteneciente a un usuario cuyo rol no está autorizado para la operación (por ejemplo, rol `usuario` intentando modificar el catálogo).
- **`404 Not Found`**: Recurso o referencia inexistente (producto inexistente, favorito no encontrado para el usuario autenticado, o ruta no definida).
- **`409 Conflict`**: Violación de unicidad (correo ya registrado o intento de agregar un producto duplicado a favoritos).

### Tabla de Endpoints (Prefijo `/api`)

| Método y Ruta | Acceso | Propósito |
|---|---|---|
| `POST /api/auth/registro` | Público | Registra un usuario asignando siempre rol `usuario` |
| `POST /api/auth/login` | Público | Valida credenciales y emite un JWT con expiración |
| `GET /api/productos` | Público | Lista el catálogo; admite filtro `?categoria=...` |
| `GET /api/productos/:id` | Público | Obtiene el detalle de un producto |
| `POST /api/productos` | Admin | Crea un producto nuevo |
| `PUT /api/productos/:id` | Admin | Actualiza un producto existente |
| `DELETE /api/productos/:id` | Admin | Elimina un producto y limpia sus favoritos en cascada |
| `GET /api/favoritos` | Autenticado | Lista únicamente los favoritos del usuario del JWT |
| `POST /api/favoritos` | Autenticado | Agrega un producto a favoritos del usuario del JWT |
| `DELETE /api/favoritos/:productoId` | Autenticado | Quita un producto de los favoritos del usuario del JWT |

### Ejemplos de Cuerpos de Petición y Respuesta

#### 1. `POST /api/auth/registro` (Público)
- **Petición:**
  ```json
  {
    "nombre": "Usuario Prueba A",
    "correo": "usuario.a@ejemplo.local",
    "password": "ClavePrueba123"
  }
  ```
- **Respuesta `201 Created`:** *(nunca incluye `password` ni `password_hash`)*
  ```json
  {
    "mensaje": "Usuario registrado exitosamente",
    "usuario": {
      "id": 2,
      "nombre": "Usuario Prueba A",
      "correo": "usuario.a@ejemplo.local",
      "rol": "usuario",
      "creado_en": "2026-11-18T21:40:00.000Z"
    }
  }
  ```

#### 2. `POST /api/auth/login` (Público)
- **Petición:**
  ```json
  {
    "correo": "usuario.a@ejemplo.local",
    "password": "ClavePrueba123"
  }
  ```
- **Respuesta `200 OK`:**
  ```json
  {
    "mensaje": "Inicio de sesión exitoso",
    "token": "<JWT_FIRMADO>",
    "usuario": {
      "id": 2,
      "nombre": "Usuario Prueba A",
      "correo": "usuario.a@ejemplo.local",
      "rol": "usuario"
    }
  }
  ```
  *(Nota para pruebas de expiración: si se envía `"expirado": true` en el login, la API emite un token ya vencido para demostrar la validación `401 Token expirado` en Postman sin necesidad de esperar horas).*

#### 3. `POST /api/productos` / `PUT /api/productos/:id` (Solo `admin`)
- **Cabecera:** `Authorization: Bearer <adminToken>`
- **Petición:**
  ```json
  {
    "nombre": "Tablet Gráfica Pro",
    "descripcion": "Tableta digitalizadora de alta precisión con lápiz sin batería.",
    "categoria": "Diseño",
    "precio": 249.50
  }
  ```
- **Respuesta `201 Created` (o `200 OK` en `PUT`):**
  ```json
  {
    "mensaje": "Producto creado exitosamente",
    "producto": {
      "id": 7,
      "nombre": "Tablet Gráfica Pro",
      "descripcion": "Tableta digitalizadora de alta precisión con lápiz sin batería.",
      "categoria": "Diseño",
      "precio": 249.5,
      "creado_en": "2026-11-18T21:42:00.000Z",
      "actualizado_en": "2026-11-18T21:42:00.000Z"
    }
  }
  ```

#### 4. `POST /api/favoritos` (Autenticado)
- **Cabecera:** `Authorization: Bearer <userToken>`
- **Petición:**
  ```json
  {
    "productoId": 1
  }
  ```
- **Respuesta `201 Created`:**
  ```json
  {
    "mensaje": "Producto agregado a favoritos",
    "favorito": {
      "id": 1,
      "usuario_id": 2,
      "producto_id": 1,
      "creado_en": "2026-11-18T21:45:00.000Z",
      "producto": {
        "id": 1,
        "nombre": "Laptop Pro 14",
        "descripcion": "Computadora portátil de 14 pulgadas con 16 GB de RAM y SSD de 512 GB.",
        "categoria": "Electrónica",
        "precio": 1150
      }
    }
  }
  ```

---

## Cómo Ejecutar las Pruebas

### Opción A: Pruebas automatizadas en terminal (`npm test`)
Ejecuta 30 aserciones HTTP end-to-end contra un directorio temporal aislado (`.pgdata-test`), incluyendo verificación de firma/expiración JWT, roles, aislamiento entre Usuarios A y B, limpieza en cascada y **reinicio completo del servidor y base de datos**:
```bash
npm test
```

### Opción B: Pruebas en Postman (Colección + Entorno exportados)
1. Inicie la API en su terminal:
   ```bash
   npm run db:init
   npm start
   ```
2. Abra **Postman** e importe ambos archivos desde la carpeta `postman/`:
   - `postman/Catalogo_Productos_Favoritos.postman_collection.json`
   - `postman/Catalogo_Local.postman_environment.json`
3. Seleccione el entorno **`Catalogo API - Entorno Local (Ejemplo sin Secretos)`**.
4. Edite las variables `adminCorreo` y `adminPassword` en su entorno local de Postman para que coincidan con los valores que definió en su archivo `.env` (no guarde la contraseña en el repositorio).
5. Ejecute las carpetas en orden (`1` a `6`) desde el **Collection Runner** o petición por petición:
   - **Carpeta 1:** Registro de Usuarios A y B (comprobando que `rol: "admin"` en registro se ignora), rechazo de duplicado `409`, logins y emisión de token vencido.
   - **Carpeta 2:** Consulta pública, filtro por categoría, consulta por ID y CRUD completo como administrador.
   - **Carpeta 3:** Validaciones de precio inválido (`<= 0`), campos vacíos (`400`) y producto inexistente (`404`).
   - **Carpeta 4:** Rechazo sin token o token vencido (`401`) y bloqueo a rol `usuario` (`403`).
   - **Carpeta 5:** CRUD de favoritos, rechazo de duplicado (`409`), producto inexistente (`404`) y aislamiento total entre Usuarios A y B.
   - **Carpeta 6:** Eliminación de producto y limpieza en cascada. Antes de ejecutar las peticiones **6.4** y **6.5**, detenga el servidor (`Ctrl + C`), vuelva a ejecutar `npm start` y ejecute `6.4` y `6.5` para comprobar la persistencia tras reiniciar Node.js.

---

## Recursos y Herramientas Utilizadas

- [Express.js](https://expressjs.com/) — Enrutamiento y middlewares HTTP.
- [node-postgres (`pg`)](https://node-postgres.com/) y [PGlite (`@electric-sql/pglite`)](https://pglite.dev/) — Conexión PostgreSQL con consultas parametrizadas y soporte embebido persistente.
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) — Generación y verificación de JWT con firma y expiración.
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — Hashing seguro de contraseñas.
- [dotenv](https://github.com/motdotla/dotenv) y [cors](https://github.com/expressjs/cors) — Variables de entorno y CORS.
- [Postman](https://www.postman.com/) — Pruebas de endpoints y aserciones automatizadas.

