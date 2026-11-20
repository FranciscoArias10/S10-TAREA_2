const db = require('../config/db');

/**
 * Crea un nuevo usuario en la base de datos sin devolver el hash de contraseña.
 *
 * @param {{ nombre: string, correo: string, passwordHash: string, rol?: string }} datos
 * @returns {Promise<object>}
 */
async function crearUsuario({ nombre, correo, passwordHash, rol = 'usuario' }) {
  const sql = `
    INSERT INTO usuarios (nombre, correo, password_hash, rol)
    VALUES ($1, $2, $3, $4)
    RETURNING id, nombre, correo, rol, creado_en
  `;
  const { rows } = await db.query(sql, [
    nombre.trim(),
    correo.trim().toLowerCase(),
    passwordHash,
    rol,
  ]);
  return rows[0];
}

/**
 * Busca un usuario por correo electrónico (incluye password_hash para validación interna en login).
 *
 * @param {string} correo
 * @returns {Promise<object|null>}
 */
async function buscarPorCorreo(correo) {
  const sql = `
    SELECT id, nombre, correo, password_hash, rol, creado_en
    FROM usuarios
    WHERE LOWER(correo) = LOWER($1)
  `;
  const { rows } = await db.query(sql, [correo.trim()]);
  return rows[0] || null;
}

/**
 * Busca un usuario por su identificador sin exponer su hash de contraseña.
 *
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function buscarPorId(id) {
  const sql = `
    SELECT id, nombre, correo, rol, creado_en
    FROM usuarios
    WHERE id = $1
  `;
  const { rows } = await db.query(sql, [id]);
  return rows[0] || null;
}

module.exports = {
  crearUsuario,
  buscarPorCorreo,
  buscarPorId,
};

