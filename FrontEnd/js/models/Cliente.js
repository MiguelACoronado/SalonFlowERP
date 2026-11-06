/* MODELO · Clientes. */
SF.models.Cliente = (function () {
  var items = SF.data.clientes.map(function (c) { return Object.assign({}, c); });
  var seq = items.length;

  return {
    all: function () { return items.slice(); },
    buscar: function (texto) {
      var q = (texto || '').trim().toLowerCase();
      if (!q) return this.all();
      return items.filter(function (c) {
        return c.nombre.toLowerCase().indexOf(q) > -1 || c.telefono.replace(/\s/g, '').indexOf(q.replace(/\s/g, '')) > -1;
      });
    },
    existe: function (nombre) {
      return items.some(function (c) { return c.nombre.toLowerCase() === nombre.trim().toLowerCase(); });
    },
    add: function (datos) {
      var cliente = Object.assign({ id: ++seq, ultimaVisita: null }, datos);
      items.push(cliente);
      return cliente;
    },
    total: function () { return items.length; },
    /* Clientes con visita registrada hace más de `dias` días (respecto a la fecha de referencia). */
    inactivos: function (dias) {
      var hoy = SF.models.Catalogo.hoy();
      return items.filter(function (c) {
        return c.ultimaVisita && SF.util.dias(c.ultimaVisita, hoy) > dias;
      });
    }
  };
})();
