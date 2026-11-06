/* VISTA · Inicio: presentación, indicadores y representación de los módulos. */
SF.views.Inicio = {
  render: function (root, vm) {
    var esc = SF.util.esc;

    var kpis = vm.kpis.map(function (k) {
      return '<div class="ledger-item"><div class="lbl">' + esc(k.etiqueta) + '</div>' +
        '<div class="val">' + esc(k.valor) + '</div>' +
        (k.nota ? '<div class="note' + (k.alerta ? ' warn' : '') + '">' + esc(k.nota) + '</div>' : '') + '</div>';
    }).join('');

    var modulos = vm.modulos.map(function (m, i) {
      return '<a class="board-row" href="#/' + m.ruta + '">' +
        '<div class="num">0' + (i + 1) + '</div>' +
        '<div class="body"><h3>' + esc(m.titulo) + '</h3><p>' + esc(m.descripcion) + '</p></div>' +
        '<div class="meta">' + esc(m.resumen) + '</div></a>';
    }).join('');

    root.innerHTML =
      '<div class="hero"><h2>Toda tu peluquería, organizada en un solo lugar.</h2>' +
      '<p>Citas, clientes, inventario y comisiones sin agendas de papel ni hojas de cálculo sueltas.</p></div>' +
      '<div class="ledger">' + kpis + '</div>' +
      '<div class="section-title">Módulos del sistema</div>' +
      '<div class="board">' + modulos + '</div>';
  }
};
