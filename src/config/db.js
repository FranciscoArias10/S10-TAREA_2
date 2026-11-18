const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const { PGlite } = require('@electric-sql/pglite');

require('dotenv').config();

let poolInstance = null;
let pgliteInstance = null;
let pgliteInitPromise = null;

/**
 * Determina si se debe utilizar el motor PostgreSQL embebido persistente (PGlite)
 * o una conexión estándar hacia un servidor PostgreSQL externo mediante `pg.Pool`.
 *
 * @returns {boolean}
 */
function usarMotorEmbebido() {
  if (process.env.USE_EMBEDDED_PG === 'true') {
    return true;
  }
  if (process.env.USE_EMBEDDED_PG === 'false') {
    return false;
  }
  return !process.env.DATABASE_URL && !process.env.DB_HOST;
}

/**
 * Obtiene o inicializa la instancia única del cliente de base de datos configurado.
 *
 * @returns {Promise<{ tipo: 'pglite' | 'pg', client: PGlite | Pool }>}
 */
async function obtenerCliente() {
  if (usarMotorEmbebido()) {
    if (!pgliteInitPromise) {
      pgliteInitPromise = (async () => {
        const dataDir = path.resolve(
          process.cwd(),
          process.env.PG_DATA_DIR || './.pgdata'
        );
        fs.mkdirSync(dataDir, { recursive: true });
        const db = new PGlite(dataDir);
        await db.waitReady;
        pgliteInstance = db;
        return db;
      })();
    }
    const client = await pgliteInitPromise;
    return { tipo: 'pglite', client };
  }

  if (!poolInstance) {
    const useSsl = process.env.DB_SSL === 'true';
    const config = process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: useSsl ? { rejectUnauthorized: false } : false,
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT || 5432),
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'catalogo_db',
          ssl: useSsl ? { rejectUnauthorized: false } : false,
        };

    poolInstance = new Pool(config);
  }

  return { tipo: 'pg', client: poolInstance };
}

/**
 * Ejecuta una consulta SQL parametrizada ($1, $2, ...).
 *
 * @param {string} text - Sentencia SQL con marcadores posicionales.
 * @param {Array} [params=[]] - Valores de los parámetros.
 * @returns {Promise<{ rows: Array, rowCount: number }>}
 */
async function query(text, params = []) {
  const { tipo, client } = await obtenerCliente();

  if (tipo === 'pglite') {
    const res = await client.query(text, params);
    const rows = Array.isArray(res.rows) ? res.rows : [];
    const rowCount =
      rows.length > 0
        ? rows.length
        : typeof res.affectedRows === 'number'
          ? res.affectedRows
          : 0;
    return { rows, rowCount };
  }

  const res = await client.query(text, params);
  return {
    rows: res.rows,
    rowCount: res.rowCount ?? res.rows.length,
  };
}

/**
 * Ejecuta un script SQL completo (por ejemplo, schema.sql con múltiples sentencias DDL).
 *
 * @param {string} sqlScript
 * @returns {Promise<void>}
 */
async function exec(sqlScript) {
  const { tipo, client } = await obtenerCliente();

  if (tipo === 'pglite') {
    await client.exec(sqlScript);
    return;
  }

  await client.query(sqlScript);
}

/**
 * Cierra las conexiones activas a la base de datos.
 *
 * @returns {Promise<void>}
 */
async function close() {
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
    pgliteInitPromise = null;
  }
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

/**
 * Devuelve una descripción del motor activo para bitácoras y diagnóstico.
 *
 * @returns {string}
 */
function getEngineName() {
  return usarMotorEmbebido()
    ? `PostgreSQL embebido persistente (${process.env.PG_DATA_DIR || './.pgdata'})`
    : 'PostgreSQL externo (pg.Pool)';
}

module.exports = {
  query,
  exec,
  close,
  getEngineName,
  usarMotorEmbebido,
};

