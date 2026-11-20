const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const {
  validarRegistro,
  validarLogin,
} = require('../middlewares/validacion.middleware');

const router = Router();

router.post('/registro', validarRegistro, authController.registro);
router.post('/login', validarLogin, authController.login);

module.exports = router;

