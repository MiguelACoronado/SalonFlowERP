/* MODELO · Indicadores del negocio (calculados a partir de los datos de prueba). */
SF.models.Reporte = {
  ingresosMes: function () {
    return SF.data.produccion.reduce(function (s, p) { return s + p.total; }, 0);
  },
  serviciosRealizados: function () {
    return SF.data.produccion.reduce(function (s, p) { return s + p.servicios; }, 0);
  },
  ticketPromedio: function () { return this.ingresosMes() / this.serviciosRealizados(); },
  serviciosPopulares: function () { return SF.data.serviciosPopulares.slice(); },
  servicioTop: function () {
    return SF.data.serviciosPopulares.reduce(function (a, b) { return b.cantidad > a.cantidad ? b : a; });
  },
  ocupacion: function () { return SF.data.ocupacionSemanal.slice(); },
  diaTop: function () {
    return SF.data.ocupacionSemanal.reduce(function (a, b) { return b.pct > a.pct ? b : a; });
  }
};
