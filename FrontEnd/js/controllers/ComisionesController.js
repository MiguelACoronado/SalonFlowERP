/* CONTROLADOR · Comisiones. */
SF.controllers.Comisiones = (function () {
  var root;
  var M = SF.models;

  function mostrar(r) {
    if (r) root = r;
    var calc = M.Comision.calcular();
    SF.views.Comisiones.render(root, {
      tasa: calc.tasa, tasas: M.Comision.TASAS, filas: calc.filas, totales: calc.totales
    }, { onTasa: function (t) { M.Comision.setTasa(t); mostrar(); } });
  }

  return { mostrar: mostrar };
})();
