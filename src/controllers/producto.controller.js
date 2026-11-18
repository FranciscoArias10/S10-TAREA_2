const productoRepository = require('../repositories/producto.repository');

/**
 * Lista los productos del catálogo público, con filtro opcional por categoría.
 */
async function listar(req, res, next) {
  try {
    const { categoria } = req.query;
    const categoriaLimpia =
      typeof categoria === 'string' && categoria.trim() !== ''
        ? categoria.trim()
        : null;

    const productos = await productoRepository.listarProductos(categoriaLimpia);

    return res.status(200).json({
      total: productos.length,
      categoria: categoriaLimpia,
      productos,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Consulta el detalle de un producto específico por su identificador.
 */
async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const producto = await productoRepository.obtenerProductoPorId(id);

    if (!producto) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        mensaje: `No existe un producto con el identificador ${id}`,
      });
    }

    return res.status(200).json({ producto });
  } catch (err) {
    return next(err);
  }
}

/**
 * Crea un nuevo producto (solo administrador).
 */
async function crear(req, res, next) {
  try {
    const { nombre, descripcion, categoria, precio } = req.body;
    const producto = await productoRepository.crearProducto({
      nombre,
      descripcion,
      categoria,
      precio,
    });

    return res.status(201).json({
      mensaje: 'Producto creado exitosamente',
      producto,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Actualiza un producto existente (solo administrador).
 */
async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { nombre, descripcion, categoria, precio } = req.body;

    const producto = await productoRepository.actualizarProducto(id, {
      nombre,
      descripcion,
      categoria,
      precio,
    });

    if (!producto) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        mensaje: `No existe un producto con el identificador ${id}`,
      });
    }

    return res.status(200).json({
      mensaje: 'Producto actualizado exitosamente',
      producto,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Elimina un producto del catálogo (solo administrador).
 * Los favoritos asociados se eliminan en cascada para mantener integridad referencial.
 */
async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const producto = await productoRepository.eliminarProducto(id);

    if (!producto) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        mensaje: `No existe un producto con el identificador ${id}`,
      });
    }

    return res.status(200).json({
      mensaje: 'Producto eliminado exitosamente',
      producto,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};

