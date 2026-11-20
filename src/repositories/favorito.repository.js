const db = require('../config/db');

/**
 * Normaliza la fila de favorito con datos del producto asociado.
 *
 * @param {object} row
 * @returns {object}
 */
function formatearFavorito(row) {
  if (!row) return null;
  return {
    ...row,
    precio:
      row.precio !== undefined && row.precio !== null
        ? Number(parseFloat(row.precio).toFixed(2))
        : undefined,
  };
}

/**
 * Lista únicamente los favoritos pertenecientes al usuario indicado.
 *
 * @param {number} usuarioId
 * @returns {Promise<Array<object>>}
 */
async function listarPorUsuario(usuarioId) {
  const sql = `
    SELECT f.id AS favorito_id,
           f.usuario_id,
           f.producto_id,
           f.creado_en AS agregado_en,
           p.nombre,
           p.descripcion,
           p.categoria,
           p.precio
    FROM favoritos f
    INNER JOIN productos p ON p.id = f.producto_id
    WHERE f.usuario_id = $1
    ORDER BY f.creado_en DESC, f.id DESC
  `;
  const { rows } = await db.query(sql, [usuarioId]);
  return rows.map(formatearFavorito);
}

/**
 * Busca una relación usuario-producto específica en favoritos.
 *
 * @param {number} usuarioId
 * @param {number} productoId
 * @returns {Promise<object|null>}
 */
async function buscarFavorito(usuarioId, productoId) {
  const sql = `
    SELECT id, usuario_id, producto_id, creado_en
    FROM favoritos
    WHERE usuario_id = $1 AND producto_id = $2
  `;
  const { rows } = await db.query(sql, [usuarioId, productoId]);
  return rows[0] || null;
}

/**
 * Registra un producto en los favoritos del usuario autenticado.
 *
 * @param {number} usuarioId
 * @param {number} productoId
 * @returns {Promise<object>}
 */
async function agregarFavorito(usuarioId, productoId) {
  const sql = `
    INSERT INTO favoritos (usuario_id, producto_id)
    VALUES ($1, $2)
    RETURNING id, usuario_id, producto_id, creado_en
  `;
  const { rows } = await db.query(sql, [usuarioId, productoId]);
  return rows[0];
}

/**
 * Elimina un producto de los favoritos pertenecientes exclusivamente al usuario autenticado.
 *
 * @param {number} usuarioId
 * @param {number} productoId
 * @returns {Promise<object|null>}
 */
async function eliminarFavorito(usuarioId, productoId) {
  const sql = `
    DELETE FROM favoritos
    WHERE usuario_id = $1 AND producto_id = $2
    RETURNING id, usuario_id, producto_id, creado_en
  `;
  const { rows } = await db.query(sql, [usuarioId, productoId]);
  return rows[0] || null;
}

module.exports = {
  listarPorUsuario,
  buscarFavorito,
  agregarFavorito,
  eliminarFavorito,
};

