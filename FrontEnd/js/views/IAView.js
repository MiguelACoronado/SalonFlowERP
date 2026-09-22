/* VISTA · Recomendaciones IA: lista de sugerencias con enlace al módulo relacionado. */
SF.views.IA = {
  render: function (root, vm, h) {
    var ui = SF.views.ui, esc = SF.util.esc;

    var lista = vm.recomendaciones.map(function (r) {
      return '<div class="rec"><div>' + ui.etiqueta(r.tipo, r.clase) + '</div>' +
        '<div class="body"><h3>' + esc(r.titulo) + '</h3><p>' + esc(r.detalle) + '</p></div>' +
        '<a class="ir" href="#/' + r.ruta + '">Ir a ' + esc(r.tipo.toLowerCase()) + '</a></div>';
    }).join('');

    root.innerHTML =
      ui.encabezado('Recomendaciones IA', 'Sugerencias generadas a partir del análisis de los datos del negocio.',
        '<button class="btn-ghost" id="btnActualizar">Actualizar análisis</button>') +
      (vm.recomendaciones.length
        ? '<div class="rec-list">' + lista + '</div>'
        : '<div class="empty"><h3>Aún no hay recomendaciones</h3><p>Cuando haya citas, ventas e inventario registrados, aparecerán sugerencias aquí.</p></div>') +
      '<p class="nota">Simulación: en esta fase las sugerencias salen de reglas sobre los datos de prueba. El servicio de IA real se integrará en una fase posterior.</p>';

    root.querySelector('#btnActualizar').addEventListener('click', h.onActualizar);
  }
};
