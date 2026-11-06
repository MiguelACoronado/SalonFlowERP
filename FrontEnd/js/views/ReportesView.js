/* VISTA · Reportes: indicadores y gráficos de barras sencillos (HTML/CSS). */
SF.views.Reportes = {
  barras: function (items, clase) {
    var esc = SF.util.esc;
    var max = Math.max.apply(null, items.map(function (i) { return i.valor; }));
    return items.map(function (i) {
      return '<div class="bar-row"><span>' + esc(i.etiqueta) + '</span><div class="bar"><i class="' + (clase || '') +
        '" style="width:' + Math.round(i.valor / max * 100) + '%"></i></div><b>' + esc(i.texto) + '</b></div>';
    }).join('');
  },

  render: function (root, vm) {
    var ui = SF.views.ui, esc = SF.util.esc;

    var kpis = vm.kpis.map(function (k) {
      return '<div class="ledger-item"><div class="lbl">' + esc(k.etiqueta) + '</div><div class="val sm">' + esc(k.valor) + '</div></div>';
    }).join('');

    root.innerHTML =
      ui.encabezado('Reportes', 'Indicadores generales del negocio.') +
      '<div class="ledger">' + kpis + '</div>' +
      '<div class="charts">' +
        '<div class="chart"><h3>Servicios más solicitados (mes)</h3>' + this.barras(vm.servicios) + '</div>' +
        '<div class="chart"><h3>Ocupación por día</h3>' + this.barras(vm.ocupacion, 'gold') + '</div>' +
      '</div>';
  }
};
