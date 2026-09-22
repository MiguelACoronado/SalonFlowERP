/* MODELO · Comisiones por estilista. */
SF.models.Comision = (function () {
  var TASA_INICIAL = 30;
  var tasa = TASA_INICIAL;

  return {
    TASAS: [20, 25, 30, 35, 40],
    tasa: function () { return tasa; },
    setTasa: function (t) { tasa = Number(t); },
    calcular: function () {
      var t = tasa;
      var filas = SF.data.produccion.map(function (p) {
        return { estilista: p.estilista, servicios: p.servicios, total: p.total, comision: p.total * t / 100 };
      });
      var totales = filas.reduce(function (acc, f) {
        acc.servicios += f.servicios; acc.total += f.total; acc.comision += f.comision; return acc;
      }, { servicios: 0, total: 0, comision: 0 });
      return { tasa: t, filas: filas, totales: totales };
    }
  };
})();
