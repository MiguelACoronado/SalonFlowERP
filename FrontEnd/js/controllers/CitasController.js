/* CONTROLADOR · Citas. */
SF.controllers.Citas = (function () {
  var root, filtro = '';
  var M = SF.models, V = SF.views;

  function mostrar(r) {
    if (r) root = r;
    V.Citas.render(root, {
      citas: M.Cita.byEstilista(filtro),
      estilistas: M.Catalogo.estilistas(),
      filtro: filtro
    }, { onNueva: nueva, onFiltrar: filtrar, onEstado: cambiarEstado });
  }

  function filtrar(estilista) { filtro = estilista; mostrar(); }

  function cambiarEstado(id, estado) {
    M.Cita.setEstado(id, estado);
    V.ui.aviso(estado === 'Confirmada' ? 'Cita confirmada' : 'Cita cancelada');
    mostrar();
  }

  function nueva() {
    V.Citas.formulario({
      clientes: M.Cliente.all().map(function (c) { return c.nombre; }),
      servicios: M.Catalogo.servicios(),
      estilistas: M.Catalogo.estilistas()
    }, function (datos) {
      if (M.Cita.hayConflicto(datos.estilista, datos.hora)) {
        return { error: datos.estilista + ' ya tiene una cita a las ' + SF.util.hora12(datos.hora) + ' Elige otra hora.' };
      }
      M.Cita.add(datos);
      V.ui.aviso('Cita agendada para ' + datos.cliente);
      mostrar();
    });
  }

  return { mostrar: mostrar };
})();
