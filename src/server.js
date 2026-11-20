require('dotenv').config();

const app = require('./app');
const db = require('./config/db');
const { inicializarBaseDeDatos } = require('./database/init');

const PORT = Number(process.env.PORT || 3000);

async function iniciarServidor() {
  if (!process.env.JWT_SECRET) {
    throw new Error('La variable de entorno JWT_SECRET es obligatoria');
  }

  await inicializarBaseDeDatos();

  const server = app.listen(PORT, () => {
    console.log(`[API] Servidor escuchando en http://localhost:${PORT}`);
    console.log(`[API] Prefijo principal disponible en http://localhost:${PORT}/api`);
  });

  const cerrarGracefully = async (signal) => {
    console.log(`\n[API] Señal ${signal} recibida. Cerrando servidor y base de datos...`);
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => cerrarGracefully('SIGINT'));
  process.on('SIGTERM', () => cerrarGracefully('SIGTERM'));

  return server;
}

if (require.main === module) {
  iniciarServidor().catch(async (err) => {
    console.error('[API] Error crítico al iniciar:', err.message);
    await db.close();
    process.exit(1);
  });
}

module.exports = { iniciarServidor };

