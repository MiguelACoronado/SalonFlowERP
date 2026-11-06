/* VISTA · Arquitectura del sistema: explica la organización MVC del propio prototipo. */
SF.views.Arquitectura = {
  render: function (root, vm) {
    var ui = SF.views.ui, esc = SF.util.esc;

    var filas = vm.modulos.map(function (m) {
      return '<tr><td>' + esc(m.modulo) + '</td><td><code>' + esc(m.vista) + '</code></td><td><code>' +
        esc(m.controlador) + '</code></td><td><code>' + esc(m.modelo) + '</code></td></tr>';
    }).join('');

    root.innerHTML =
      ui.encabezado('Arquitectura del sistema', 'Cómo está organizado el prototipo: Modelo · Vista · Controlador.') +

      '<div class="arq-flow">' +
        '<div class="arq-box v"><h3>Vista</h3><code>js/views/</code><p>Dibuja pantallas, formularios y tablas. Captura clics y los avisa al controlador.</p></div>' +
        '<div class="arq-arrow" aria-hidden="true">⇄</div>' +
        '<div class="arq-box c"><h3>Controlador</h3><code>js/controllers/</code><p>Recibe las acciones, valida reglas simples y coordina modelo y vista.</p></div>' +
        '<div class="arq-arrow" aria-hidden="true">⇄</div>' +
        '<div class="arq-box m"><h3>Modelo</h3><code>js/models/</code><p>Guarda el estado de cada módulo y calcula indicadores. No conoce el HTML.</p></div>' +
        '<div class="arq-arrow" aria-hidden="true">←</div>' +
        '<div class="arq-box d"><h3>Datos de prueba</h3><code>js/data/</code><p>Información de ejemplo. Se reemplazará por la base de datos.</p></div>' +
      '</div>' +

      '<div class="section-title">Cómo fluye una acción</div>' +
      '<ol class="arq-pasos">' +
        '<li>El <b>router</b> (<code>js/core/router.js</code>) detecta la pantalla pedida en la URL.</li>' +
        '<li>El <b>controlador</b> de ese módulo pide los datos al <b>modelo</b>.</li>' +
        '<li>La <b>vista</b> recibe esos datos y pinta la pantalla.</li>' +
        '<li>Cuando la persona hace clic (por ejemplo, «Confirmar»), la vista avisa al controlador, este actualiza el modelo y vuelve a pedir la vista.</li>' +
      '</ol>' +

      '<div class="section-title">Módulos y sus capas</div>' +
      '<div class="table-wrap"><table><thead><tr><th>Módulo</th><th>Vista</th><th>Controlador</th><th>Modelo</th></tr></thead><tbody>' + filas + '</tbody></table></div>' +

      '<div class="section-title">Estructura del proyecto</div>' +
      '<pre class="tree">' + esc(vm.arbol) + '</pre>';
  }
};
