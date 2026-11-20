const { Router } = require('express');
const favoritoController = require('../controllers/favorito.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const {
  validarIdParam,
  validarAgregarFavorito,
} = require('../middlewares/validacion.middleware');

const router = Router();

// Todas las rutas de favoritos requieren usuario autenticado
router.use(verificarToken);

router.get('/', favoritoController.listar);
router.post('/', validarAgregarFavorito, favoritoController.agregar);
router.delete(
  '/:productoId',
  validarIdParam('productoId'),
  favoritoController.eliminar
);

module.exports = router;

