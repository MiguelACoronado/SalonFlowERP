/* VISTA · Comisiones: tabla por estilista con porcentaje ajustable. */
SF.views.Comisiones = {
  render: function (root, vm, h) {
    var ui = SF.views.ui, esc = SF.util.esc, $ = SF.util.money;

    var opciones = vm.tasas.map(function (t) {
      return '<option value="' + t + '"' + (t === vm.tasa ? ' selected' : '') + '>' + t + '%</option>';
    }).join('');

    var filas = vm.filas.map(function (f) {
      return '<tr><td>' + esc(f.estilista) + '</td><td class="num">' + f.servicios + '</td><td class="num">' + $(f.total) +
        '</td><td class="num">' + $(f.comision) + '</td></tr>';
    }).join('');

    root.innerHTML =
      ui.encabezado('Comisiones', 'Cálculo del mes por estilista.') +
      '<div class="toolbar"><label>Porcentaje de comisión <select id="tasa">' + opciones + '</select></label></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Estilista</th><th class="num">Servicios realizados</th><th class="num">Total generado</th><th class="num">Comisión (' + vm.tasa + '%)</th></tr></thead>' +
      '<tbody>' + filas + '</tbody>' +
      '<tfoot><tr><td>Total</td><td class="num">' + vm.totales.servicios + '</td><td class="num">' + $(vm.totales.total) +
      '</td><td class="num">' + $(vm.totales.comision) + '</td></tr></tfoot></table></div>' +
      '<p class="nota">En esta fase el porcentaje es único para todos. Más adelante se podrá configurar por estilista y por servicio.</p>';

    root.querySelector('#tasa').addEventListener('change', function (e) { h.onTasa(e.target.value); });
  }
};
