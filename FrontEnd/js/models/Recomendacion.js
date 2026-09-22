/* MODELO · Recomendaciones del módulo de IA.
   En esta fase son reglas simples sobre los otros modelos (simulación). En fases posteriores
   este modelo se conectará a un servicio de IA real. */
SF.models.Recomendacion = {
  generar: function () {
    var recs = [];
    var M = SF.models;

    M.Producto.bajos().forEach(function (p) {
      recs.push({
        tipo: 'Inventario', clase: 'low', ruta: 'inventario',
        titulo: 'Reponer ' + p.nombre.toLowerCase(),
        detalle: 'Quedan ' + p.stock + ' unidades y el mínimo recomendado es ' + p.minimo + '.'
      });
    });

    var pend = M.Cita.pendientes();
    if (pend > 0) {
      recs.push({
        tipo: 'Citas', clase: 'wait', ruta: 'citas',
        titulo: 'Confirmar ' + pend + (pend === 1 ? ' cita pendiente' : ' citas pendientes') + ' de hoy',
        detalle: 'Un recordatorio por mensaje reduce las inasistencias.'
      });
    }

    M.Cliente.inactivos(30).forEach(function (c) {
      var d = SF.util.dias(c.ultimaVisita, M.Catalogo.hoy());
      recs.push({
        tipo: 'Clientes', clase: 'info', ruta: 'clientes',
        titulo: 'Reactivar a ' + c.nombre,
        detalle: 'Hace ' + d + ' días que no visita el negocio; su servicio frecuente es ' + c.servicioFrecuente.toLowerCase() + '.'
      });
    });

    var top = M.Reporte.diaTop();
    recs.push({
      tipo: 'Reportes', clase: 'ok', ruta: 'reportes',
      titulo: 'Refuerza la agenda del ' + top.dia.toLowerCase(),
      detalle: 'Es el día con mayor ocupación (' + top.pct + '%). Conviene tener a los tres estilistas disponibles.'
    });

    return recs;
  }
};
