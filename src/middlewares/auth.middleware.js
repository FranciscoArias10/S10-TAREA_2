const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación JWT.
 * Verifica presencia, formato Bearer, firma criptográfica y expiración del token.
 */
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'No autorizado',
      mensaje: 'Token de autenticación no proporcionado o formato inválido',
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      error: 'No autorizado',
      mensaje: 'Token de autenticación vacío',
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = {
      id: payload.id,
      nombre: payload.nombre,
      correo: payload.correo,
      rol: payload.rol,
    };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        mensaje: 'El token ha expirado, por favor inicie sesión nuevamente',
      });
    }

    return res.status(401).json({
      error: 'Token inválido',
      mensaje: 'La firma del token es inválida o está corrupta',
    });
  }
}

/**
 * Middleware de autorización basado en roles (RBAC).
 * Debe ejecutarse después de `verificarToken`.
 *
 * @param {...string} rolesPermitidos
 */
function requerirRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: 'Acceso prohibido',
        mensaje: `No tiene permisos suficientes para realizar esta operación. Se requiere rol: ${rolesPermitidos.join(', ')}`,
      });
    }
    return next();
  };
}

module.exports = {
  verificarToken,
  requerirRol,
};

