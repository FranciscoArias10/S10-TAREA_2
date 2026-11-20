const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const {
  rutaNoEncontrada,
  manejadorErrores,
} = require('./middlewares/error.middleware');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    estado: 'ok',
    nombre: 'API Catálogo de Productos y Favoritos',
    prefijo: '/api',
    rutas: [
      'POST /api/auth/registro',
      'POST /api/auth/login',
      'GET /api/productos',
      'GET /api/productos/:id',
      'POST /api/productos',
      'PUT /api/productos/:id',
      'DELETE /api/productos/:id',
      'GET /api/favoritos',
      'POST /api/favoritos',
      'DELETE /api/favoritos/:productoId',
    ],
  });
});

app.use('/api', routes);
app.use('/', routes);

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;

