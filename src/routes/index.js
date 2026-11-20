const { Router } = require('express');
const authRoutes = require('./auth.routes');
const productoRoutes = require('./producto.routes');
const favoritoRoutes = require('./favorito.routes');

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    estado: 'ok',
    mensaje: 'API REST de Catálogo de Productos y Favoritos operativa',
  });
});

router.use('/auth', authRoutes);
router.use('/productos', productoRoutes);
router.use('/favoritos', favoritoRoutes);

module.exports = router;

