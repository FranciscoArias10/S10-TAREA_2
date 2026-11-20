const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioRepository = require('../repositories/usuario.repository');

/**
 * Registra públicamente un nuevo usuario asignando siempre el rol 'usuario'.
 */
async function registro(req, res, next) {
  try {
    const { nombre, correo, password } = req.body;

    const existente = await usuarioRepository.buscarPorCorreo(correo);
    if (existente) {
      return res.status(409).json({
        error: 'Correo duplicado',
        mensaje: 'El correo electrónico ya está registrado',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // El registro público siempre asigna rol 'usuario', ignorando cualquier rol enviado por el cliente
    const usuario = await usuarioRepository.crearUsuario({
      nombre,
      correo,
      passwordHash,
      rol: 'usuario',
    });

    return res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      usuario,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Valida credenciales de usuario y emite un JWT firmado con expiración.
 */
async function login(req, res, next) {
  try {
    const { correo, password, expirado } = req.body;

    const usuario = await usuarioRepository.buscarPorCorreo(correo);
    if (!usuario) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'Correo o contraseña incorrectos',
      });
    }

    const passwordCorrecta = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordCorrecta) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'Correo o contraseña incorrectos',
      });
    }

    const payload = {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    };

    const expiresIn =
      expirado === true ? '-10s' : process.env.JWT_EXPIRES_IN || '2h';

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

    return res.status(200).json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  registro,
  login,
};

