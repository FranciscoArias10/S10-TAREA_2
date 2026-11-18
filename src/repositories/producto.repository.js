const db = require('../config/db');

/**
 * Normaliza una fila de producto para asegurar tipos JSON consistentes (precio numérico).
 *
 * @param {object} row
 * @returns {object}
 */
function formatearProducto(row) {
  if (!row) return null;
  return {
    ...row,
    precio: Number(parseFloat(row.precio).toFixed(2)),
  };
}

/**
 * Lista todos los productos o filtra por categoría (insensible a mayúsculas y espacios).
 *
 * @param {string} [categoria]
 * @returns {Promise<Array<object>>}
 */
async function listarProductos(categoria) {
  if (categoria && categoria.trim() !== '') {
    const sql = `
      SELECT id, nombre, descripcion, categoria, precio, creado_en, actualizado_en
      FROM productos
      WHERE LOWER(TRIM(categoria)) = LOWER(TRIM($1))
      ORDER BY id ASC
    `;
    const { rows } = await db.query(sql, [categoria.trim()]);
    return rows.map(formatearProducto);
  }

  const sql = `
    SELECT id, nombre, descripcion, categoria, precio, creado_en, actualizado_en
    FROM productos
    ORDER BY id ASC
  `;
  const { rows } = await db.query(sql);
  return rows.map(formatearProducto);
}

/**
 * Obtiene un producto por su identificador único.
 *
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function obtenerProductoPorId(id) {
  const sql = `
    SELECT id, nombre, descripcion, categoria, precio, creado_en, actualizado_en
    FROM productos
    WHERE id = $1
  `;
  const { rows } = await db.query(sql, [id]);
  return rows[0] ? formatearProducto(rows[0]) : null;
}

/**
 * Inserta un nuevo producto en el catálogo.
 *
 * @param {{ nombre: string, descripcion: string, categoria: string, precio: number }} datos
 * @returns {Promise<object>}
 */
async function crearProducto({ nombre, descripcion, categoria, precio }) {
  const sql = `
    INSERT INTO productos (nombre, descripcion, categoria, precio)
    VALUES ($1, $2, $3, $4)
    RETURNING id, nombre, descripcion, categoria, precio, creado_en, actualizado_en
  `;
  const { rows } = await db.query(sql, [
    nombre.trim(),
    descripcion.trim(),
    categoria.trim(),
    Number(precio),
  ]);
  return formatearProducto(rows[0]);
}

/**
 * Actualiza un producto existente por su identificador.
 *
 * @param {number} id
 * @param {{ nombre: string, descripcion: string, categoria: string, precio: number }} datos
 * @returns {Promise<object|null>}
 */
async function actualizarProducto(id, { nombre, descripcion, categoria, precio }) {
  const sql = `
    UPDATE productos
    SET nombre = $1,
        descripcion = $2,
        categoria = $3,
        precio = $4,
        actualizado_en = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING id, nombre, descripcion, categoria, precio, creado_en, actualizado_en
  `;
  const { rows } = await db.query(sql, [
    nombre.trim(),
    descripcion.trim(),
    categoria.trim(),
    Number(precio),
    id,
  ]);
  return rows[0] ? formatearProducto(rows[0]) : null;
}

/**
 * Elimina un producto por su identificador.
 * Los favoritos asociados se eliminan automáticamente por integridad referencial (ON DELETE CASCADE).
 *
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function eliminarProducto(id) {
  const sql = `
    DELETE FROM productos
    WHERE id = $1
    RETURNING id, nombre, descripcion, categoria, precio, creado_en, actualizado_en
  `;
  const { rows } = await db.query(sql, [id]);
  return rows[0] ? formatearProducto(rows[0]) : null;
}

module.exports = {
  listarProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
};

