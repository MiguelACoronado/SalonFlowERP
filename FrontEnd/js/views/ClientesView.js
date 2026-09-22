/* VISTA · Clientes: listado con búsqueda y formulario de nuevo cliente. */
SF.views.Clientes = {
  filas: function (clientes) {
    var esc = SF.util.esc;
    if (!clientes.length) {
      return '<tr><td colspan="4"><div class="empty"><h3>Sin resultados</h3><p>Ningún cliente coincide con la búsqueda.</p></div></td></tr>';
    }
    return clientes.map(function (c) {
      return '<tr><td>' + esc(c.nombre) + '</td><td>' + esc(c.telefono) + '</td><td>' + SF.util.fecha(c.ultimaVisita) +
        '</td><td>' + esc(c.servicioFrecuente) + '</td></tr>';
    }).join('');
  },

  render: function (root, vm, h) {
    var ui = SF.views.ui;
    root.innerHTML =
      ui.encabezado('Clientes', 'Historial y datos de contacto.', '<button class="btn-primary" id="btnNuevo">+ Nuevo cliente</button>') +
      '<div class="toolbar"><label>Buscar <input type="search" id="buscar" placeholder="Nombre o teléfono"></label></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Teléfono</th><th>Última visita</th><th>Servicio frecuente</th></tr></thead>' +
      '<tbody id="filasClientes">' + this.filas(vm.clientes) + '</tbody></table></div>';

    root.querySelector('#btnNuevo').addEventListener('click', h.onNuevo);
    root.querySelector('#buscar').addEventListener('input', function (e) { h.onBuscar(e.target.value); });
  },

  /* Actualiza solo las filas para no perder el foco del buscador. */
  actualizarFilas: function (root, clientes) {
    root.querySelector('#filasClientes').innerHTML = this.filas(clientes);
  },

  formulario: function (vm, alEnviar) {
    SF.views.ui.formulario({
      titulo: 'Nuevo cliente',
      boton: 'Guardar cliente',
      alEnviar: alEnviar,
      campos: [
        { nombre: 'nombre',            etiqueta: 'Nombre completo', requerido: true },
        { nombre: 'telefono',          etiqueta: 'Teléfono',        tipo: 'tel', requerido: true },
        { nombre: 'servicioFrecuente', etiqueta: 'Servicio frecuente', tipo: 'select', opciones: vm.servicios }
      ]
    });
  }
};
