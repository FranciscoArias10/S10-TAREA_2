const favoritoRepository = require('../repositories/favorito.repository');
const productoRepository = require('../repositories/producto.repository');

/**
 * Lista los favoritos personales del usuario autenticado (identidad tomada del JWT).
 */
async function listar(req, res, next) {
  try {
    const usuarioId = req.usuario.id;
    const favoritos = await favoritoRepository.listarPorUsuario(usuarioId);

    return res.status(200).json({
      usuarioId,
      total: favoritos.length,
      favoritos,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Agrega un producto a los favoritos del usuario autenticado.
 * Ignora cualquier usuarioId enviado en el cuerpo de la petición.
 */
async function agregar(req, res, next) {
  try {
    const usuarioId = req.usuario.id;
    const { productoId } = req.body;

    const producto = await productoRepository.obtenerProductoPorId(productoId);
    if (!producto) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        mensaje: `No existe un producto con el identificador ${productoId}`,
      });
    }

    const existente = await favoritoRepository.buscarFavorito(usuarioId, productoId);
    if (existente) {
      return res.status(409).json({
        error: 'Favorito duplicado',
        mensaje: 'El producto ya se encuentra en tu lista de favoritos',
      });
    }

    const favorito = await favoritoRepository.agregarFavorito(usuarioId, productoId);

    return res.status(201).json({
      mensaje: 'Producto agregado a favoritos',
      favorito: {
        ...favorito,
        producto,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Quita un producto de los favoritos del usuario autenticado.
 * Garantiza aislamiento: solo elimina registros donde usuario_id coincide con el JWT.
 */
async function eliminar(req, res, next) {
  try {
    const usuarioId = req.usuario.id;
    const productoId = Number(req.params.productoId);

    const favoritoEliminado = await favoritoRepository.eliminarFavorito(
      usuarioId,
      productoId
    );

    if (!favoritoEliminado) {
      return res.status(404).json({
        error: 'Favorito no encontrado',
        mensaje: `El producto ${productoId} no se encuentra en tu lista de favoritos`,
      });
    }

    return res.status(200).json({
      mensaje: 'Producto eliminado de favoritos',
      favoritoEliminado,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listar,
  agregar,
  eliminar,
};

