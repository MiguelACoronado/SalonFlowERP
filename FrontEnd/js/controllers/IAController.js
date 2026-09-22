/* CONTROLADOR · Recomendaciones IA. */
SF.controllers.IA = (function () {
  var root;

  function mostrar(r) {
    if (r) root = r;
    SF.views.IA.render(root, { recomendaciones: SF.models.Recomendacion.generar() }, {
      onActualizar: function () { mostrar(); SF.views.ui.aviso('Análisis actualizado'); }
    });
  }

  return { mostrar: mostrar };
})();
