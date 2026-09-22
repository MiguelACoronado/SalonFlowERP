/* CONTROLADOR · Reportes. */
SF.controllers.Reportes = {
  mostrar: function (root) {
    var R = SF.models.Reporte;
    SF.views.Reportes.render(root, {
      kpis: [
        { etiqueta: 'Servicio más solicitado', valor: R.servicioTop().nombre },
        { etiqueta: 'Día más ocupado',         valor: R.diaTop().dia },
        { etiqueta: 'Ticket promedio',         valor: SF.util.money(R.ticketPromedio()) }
      ],
      servicios: R.serviciosPopulares().map(function (s) { return { etiqueta: s.nombre, valor: s.cantidad, texto: String(s.cantidad) }; }),
      ocupacion: R.ocupacion().map(function (o) { return { etiqueta: o.dia, valor: o.pct, texto: o.pct + '%' }; })
    });
  }
};
