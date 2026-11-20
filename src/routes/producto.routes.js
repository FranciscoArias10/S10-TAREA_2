const { Router } = require('express');
const productoController = require('../controllers/producto.controller');
const {
  verificarToken,
  requerirRol,
} = require('../middlewares/auth.middleware');
const {
  validarIdParam,
  validarProducto,
} = require('../middlewares/validacion.middleware');

const router = Router();

// Rutas públicas de consulta
router.get('/', productoController.listar);
router.get('/:id', validarIdParam('id'), productoController.obtenerPorId);

// Rutas protegidas exclusivas para administrador
router.post(
  '/',
  verificarToken,
  requerirRol('admin'),
  validarProducto,
  productoController.crear
);

router.put(
  '/:id',
  verificarToken,
  requerirRol('admin'),
  validarIdParam('id'),
  validarProducto,
  productoController.actualizar
);

router.delete(
  '/:id',
  verificarToken,
  requerirRol('admin'),
  validarIdParam('id'),
  productoController.eliminar
);

module.exports = router;

