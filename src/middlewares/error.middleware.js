/**
 * Middleware para responder con 404 ante rutas inexistentes.
 */
function rutaNoEncontrada(req, res) {
  return res.status(404).json({
    error: 'Ruta no encontrada',
    mensaje: `La ruta ${req.method} ${req.originalUrl} no existe en esta API`,
  });
}

/**
 * Manejador global de errores.
 * Traduce errores conocidos de JSON/PostgreSQL a respuestas HTTP coherentes
 * sin exponer secretos, consultas SQL ni trazas internas.
 */
function manejadorErrores(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON inválido',
      mensaje: 'El cuerpo de la petición no tiene un formato JSON válido',
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Conflicto de duplicado',
      mensaje: 'Ya existe un registro con los datos proporcionados',
    });
  }

  if (err.code === '23503') {
    return res.status(404).json({
      error: 'Referencia no encontrada',
      mensaje: 'El recurso referenciado no existe',
    });
  }

  if (err.code === '23514' || err.code === '22P02') {
    return res.status(400).json({
      error: 'Datos inválidos',
      mensaje: 'Los valores proporcionados no cumplen las restricciones permitidas',
    });
  }

  console.error('[ERROR]', err.message);
  return res.status(500).json({
    error: 'Error interno del servidor',
    mensaje: 'Ocurrió un error inesperado al procesar la solicitud',
  });
}

module.exports = {
  rutaNoEncontrada,
  manejadorErrores,
};

