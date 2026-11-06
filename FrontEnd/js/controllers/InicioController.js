/* CONTROLADOR · Inicio: arma los indicadores y el resumen de cada módulo. */
SF.controllers.Inicio = {
  mostrar: function (root) {
    var M = SF.models, $ = SF.util.money;
    var bajos = M.Producto.bajos().length;
    var comision = M.Comision.calcular();

    SF.views.Inicio.render(root, {
      kpis: [
        { etiqueta: 'Citas de hoy',       valor: String(M.Cita.activas()), nota: M.Cita.pendientes() + ' por confirmar' },
        { etiqueta: 'Clientes activos',   valor: String(M.Cliente.total()) },
        { etiqueta: 'Ingresos del mes',   valor: $(M.Reporte.ingresosMes()) },
        { etiqueta: 'Stock bajo',         valor: String(bajos), nota: bajos ? 'requieren pedido' : 'todo en orden', alerta: bajos > 0 }
      ],
      modulos: [
        { ruta: 'citas',      titulo: 'Citas',       descripcion: 'Agenda, confirma y reprograma citas de clientes por estilista.', resumen: M.Cita.activas() + ' hoy' },
        { ruta: 'clientes',   titulo: 'Clientes',    descripcion: 'Historial de servicios, preferencias y datos de contacto.',     resumen: M.Cliente.total() + ' registrados' },
        { ruta: 'inventario', titulo: 'Inventario',  descripcion: 'Control de productos, insumos y niveles de stock.',             resumen: bajos + ' con stock bajo' },
        { ruta: 'comisiones', titulo: 'Comisiones',  descripcion: 'Cálculo automático de comisiones por estilista y servicio.',    resumen: $(comision.totales.comision) + ' este mes' },
        { ruta: 'reportes',   titulo: 'Reportes',    descripcion: 'Indicadores de ventas, servicios más solicitados y ocupación.', resumen: M.Reporte.servicioTop().nombre },
        { ruta: 'ia',         titulo: 'Recomendaciones IA', descripcion: 'Sugerencias generadas a partir del análisis de los datos del negocio.', resumen: M.Recomendacion.generar().length + ' sugerencias' }
      ]
    });
  }
};
