/* CONTROLADOR · Clientes. */
SF.controllers.Clientes = (function () {
  var root;
  var M = SF.models, V = SF.views;

  function mostrar(r) {
    if (r) root = r;
    V.Clientes.render(root, { clientes: M.Cliente.all() }, { onNuevo: nuevo, onBuscar: buscar });
  }

  function buscar(texto) { V.Clientes.actualizarFilas(root, M.Cliente.buscar(texto)); }

  function nuevo() {
    V.Clientes.formulario({ servicios: M.Catalogo.servicios() }, function (datos) {
      if (M.Cliente.existe(datos.nombre)) return { error: 'Ya existe un cliente con ese nombre.' };
      M.Cliente.add(datos);
      V.ui.aviso('Cliente guardado');
      mostrar();
    });
  }

  return { mostrar: mostrar };
})();
