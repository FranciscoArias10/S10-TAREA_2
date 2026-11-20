const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ENTERO_POSITIVO_REGEX = /^[1-9]\d*$/;

/**
 * Valida que un parámetro de ruta sea un identificador entero positivo.
 *
 * @param {string} [paramName='id']
 */
function validarIdParam(paramName = 'id') {
  return (req, res, next) => {
    const valor = String(req.params[paramName] ?? '').trim();
    if (!ENTERO_POSITIVO_REGEX.test(valor)) {
      return res.status(400).json({
        error: 'Identificador inválido',
        mensaje: `El parámetro '${paramName}' debe ser un número entero positivo`,
      });
    }
    return next();
  };
}

/**
 * Valida el cuerpo de la petición de registro de usuario.
 */
function validarRegistro(req, res, next) {
  const { nombre, correo, password } = req.body || {};
  const errores = [];

  if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 100) {
    errores.push('El nombre es obligatorio y debe tener entre 2 y 100 caracteres');
  }

  if (typeof correo !== 'string' || !EMAIL_REGEX.test(correo.trim())) {
    errores.push('Debe proporcionar un correo electrónico válido');
  }

  if (typeof password !== 'string' || password.trim().length < 6) {
    errores.push('La contraseña es obligatoria y debe tener al menos 6 caracteres');
  }

  if (errores.length > 0) {
    return res.status(400).json({
      error: 'Datos de registro inválidos',
      mensaje: errores[0],
      errores,
    });
  }

  return next();
}

/**
 * Valida el cuerpo de la petición de inicio de sesión.
 */
function validarLogin(req, res, next) {
  const { correo, password } = req.body || {};
  const errores = [];

  if (typeof correo !== 'string' || !EMAIL_REGEX.test(correo.trim())) {
    errores.push('Debe proporcionar un correo electrónico válido');
  }

  if (typeof password !== 'string' || password.length === 0) {
    errores.push('La contraseña es obligatoria');
  }

  if (errores.length > 0) {
    return res.status(400).json({
      error: 'Datos de inicio de sesión inválidos',
      mensaje: errores[0],
      errores,
    });
  }

  return next();
}

/**
 * Valida el cuerpo de creación o actualización de un producto.
 */
function validarProducto(req, res, next) {
  const { nombre, descripcion, categoria, precio } = req.body || {};
  const errores = [];

  if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 150) {
    errores.push('El nombre del producto es obligatorio y debe tener entre 2 y 150 caracteres');
  }

  if (typeof descripcion !== 'string' || descripcion.trim().length < 3) {
    errores.push('La descripción del producto es obligatoria y no puede estar vacía');
  }

  if (typeof categoria !== 'string' || categoria.trim().length < 2 || categoria.trim().length > 80) {
    errores.push('La categoría del producto es obligatoria y debe tener entre 2 y 80 caracteres');
  }

  const esTipoNumerico =
    typeof precio === 'number' || (typeof precio === 'string' && precio.trim() !== '');
  const precioNumerico = Number(precio);

  if (!esTipoNumerico || !Number.isFinite(precioNumerico) || precioNumerico <= 0) {
    errores.push('El precio es obligatorio y debe ser un número mayor que cero');
  }

  if (errores.length > 0) {
    return res.status(400).json({
      error: 'Datos de producto inválidos',
      mensaje: errores[0],
      errores,
    });
  }

  req.body.precio = Number(precioNumerico.toFixed(2));
  return next();
}

/**
 * Valida el cuerpo al agregar un producto a favoritos.
 */
function validarAgregarFavorito(req, res, next) {
  const rawId = req.body?.productoId ?? req.body?.producto_id;
  const esTipoValido = typeof rawId === 'number' || typeof rawId === 'string';
  const valorStr = esTipoValido ? String(rawId).trim() : '';

  if (!ENTERO_POSITIVO_REGEX.test(valorStr)) {
    return res.status(400).json({
      error: 'Identificador de producto inválido',
      mensaje: 'El campo productoId es obligatorio y debe ser un entero positivo',
    });
  }

  req.body.productoId = Number(valorStr);
  return next();
}

module.exports = {
  validarIdParam,
  validarRegistro,
  validarLogin,
  validarProducto,
  validarAgregarFavorito,
};

