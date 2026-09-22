/* MODELO · Inventario de productos e insumos. */
SF.models.Producto = (function () {
  var items = SF.data.productos.map(function (p) { return Object.assign({}, p); });
  var seq = items.length;

  return {
    all: function () { return items.slice(); },
    estado: function (p) { return p.stock <= p.minimo ? 'Stock bajo' : 'Disponible'; },
    bajos: function () {
      return items.filter(function (p) { return p.stock <= p.minimo; });
    },
    add: function (datos) {
      var p = Object.assign({ id: ++seq }, datos);
      items.push(p);
      return p;
    },
    ajustar: function (id, delta) {
      var p = items.find(function (x) { return x.id === id; });
      if (p) p.stock = Math.max(0, p.stock + delta);
      return p;
    }
  };
})();
