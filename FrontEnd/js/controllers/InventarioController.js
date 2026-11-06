/* CONTROLADOR · Inventario. */
SF.controllers.Inventario = (function () {
  var root;
  var M = SF.models, V = SF.views;

  function mostrar(r) {
    if (r) root = r;
    var productos = M.Producto.all().map(function (p) {
      return Object.assign({}, p, { estado: M.Producto.estado(p) });
    });
    V.Inventario.render(root, { productos: productos }, { onNuevo: nuevo, onAjustar: ajustar });
  }

  function ajustar(id, delta) { M.Producto.ajustar(id, delta); mostrar(); }

  function nuevo() {
    V.Inventario.formulario({ categorias: M.Catalogo.categorias() }, function (d) {
      M.Producto.add({ nombre: d.nombre, categoria: d.categoria, stock: Number(d.stock), minimo: Number(d.minimo) });
      V.ui.aviso('Producto agregado');
      mostrar();
    });
  }

  return { mostrar: mostrar };
})();
