/* MODELO · Citas. Estado en memoria; sin acceso a base de datos. */
SF.models.Cita = (function () {
  var items = SF.data.citas.map(function (c) { return Object.assign({}, c); });
  var seq = items.length;

  function porHora(a, b) { return a.hora.localeCompare(b.hora); }

  return {
    all: function () { return items.slice().sort(porHora); },
    byEstilista: function (estilista) {
      return this.all().filter(function (c) { return !estilista || c.estilista === estilista; });
    },
    hayConflicto: function (estilista, hora) {
      return items.some(function (c) {
        return c.estilista === estilista && c.hora === hora && c.estado !== 'Cancelada';
      });
    },
    add: function (datos) {
      var cita = Object.assign({ id: ++seq, estado: 'Pendiente' }, datos);
      items.push(cita);
      return cita;
    },
    setEstado: function (id, estado) {
      var cita = items.find(function (c) { return c.id === id; });
      if (cita) cita.estado = estado;
      return cita;
    },
    activas:    function () { return items.filter(function (c) { return c.estado !== 'Cancelada'; }).length; },
    pendientes: function () { return items.filter(function (c) { return c.estado === 'Pendiente'; }).length; }
  };
})();
