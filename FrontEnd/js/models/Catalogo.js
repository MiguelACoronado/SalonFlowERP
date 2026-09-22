/* MODELO · Catálogos de apoyo (estilistas, servicios, categorías). */
SF.models.Catalogo = {
  estilistas:  function () { return SF.data.estilistas.slice(); },
  servicios:   function () { return SF.data.servicios.map(function (s) { return s.nombre; }); },
  categorias:  function () { return SF.data.categoriasProducto.slice(); },
  hoy:         function () { return SF.data.hoy; }
};
