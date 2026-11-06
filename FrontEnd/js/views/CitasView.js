/* VISTA · Citas: agenda del día, filtro por estilista y formulario de nueva cita. */
SF.views.Citas = {
  render: function (root, vm, h) {
    var ui = SF.views.ui, esc = SF.util.esc;

    var opciones = '<option value="">Todos los estilistas</option>' + vm.estilistas.map(function (e) {
      return '<option' + (e === vm.filtro ? ' selected' : '') + '>' + esc(e) + '</option>';
    }).join('');

    var clases = { Confirmada: 'ok', Pendiente: 'wait', Cancelada: 'low' };

    var filas = vm.citas.map(function (c) {
      var acciones = '';
      if (c.estado === 'Pendiente')  acciones += '<button class="btn-mini" data-id="' + c.id + '" data-estado="Confirmada">Confirmar</button>';
      if (c.estado !== 'Cancelada')  acciones += '<button class="btn-mini danger" data-id="' + c.id + '" data-estado="Cancelada">Cancelar</button>';
      return '<tr><td>' + SF.util.hora12(c.hora) + '</td><td>' + esc(c.cliente) + '</td><td>' + esc(c.servicio) +
        '</td><td>' + esc(c.estilista) + '</td><td>' + ui.etiqueta(c.estado, clases[c.estado]) +
        '</td><td><div class="acciones">' + acciones + '</div></td></tr>';
    }).join('');

    root.innerHTML =
      ui.encabezado('Citas', 'Agenda del día por estilista.', '<button class="btn-primary" id="btnNueva">+ Nueva cita</button>') +
      '<div class="toolbar"><label>Estilista <select id="filtroEstilista">' + opciones + '</select></label></div>' +
      (vm.citas.length
        ? '<div class="table-wrap"><table><thead><tr><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Estilista</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' + filas + '</tbody></table></div>'
        : '<div class="empty"><h3>No hay citas para mostrar</h3><p>Prueba con otro estilista o crea una nueva cita.</p></div>');

    root.querySelector('#btnNueva').addEventListener('click', h.onNueva);
    root.querySelector('#filtroEstilista').addEventListener('change', function (e) { h.onFiltrar(e.target.value); });
    root.querySelectorAll('button[data-estado]').forEach(function (b) {
      b.addEventListener('click', function () { h.onEstado(Number(b.dataset.id), b.dataset.estado); });
    });
  },

  /* Formulario de nueva cita (la validación de negocio la hace el controlador). */
  formulario: function (vm, alEnviar) {
    SF.views.ui.formulario({
      titulo: 'Nueva cita',
      boton: 'Guardar cita',
      alEnviar: alEnviar,
      campos: [
        { nombre: 'cliente',   etiqueta: 'Cliente',   requerido: true, lista: vm.clientes },
        { nombre: 'servicio',  etiqueta: 'Servicio',  tipo: 'select', opciones: vm.servicios },
        { nombre: 'estilista', etiqueta: 'Estilista', tipo: 'select', opciones: vm.estilistas },
        { nombre: 'hora',      etiqueta: 'Hora',      tipo: 'time',   requerido: true, min: '08:00', max: '20:00' }
      ]
    });
  }
};
