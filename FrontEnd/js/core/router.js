/* Router por hash (#/citas). Cada ruta apunta a un controlador. */
SF.router = (function () {
  var rutas = {}, root, alCambiar;

  function registrar(ruta, def) { rutas[ruta] = def; }

  function actual() {
    var ruta = location.hash.replace(/^#\/?/, '');
    return rutas[ruta] ? ruta : 'inicio';
  }

  function pintar() {
    var ruta = actual();
    rutas[ruta].controlador.mostrar(root);
    if (alCambiar) alCambiar(ruta, rutas[ruta]);
    window.scrollTo(0, 0);
  }

  function iniciar(contenedor, callback) {
    root = contenedor;
    alCambiar = callback;
    window.addEventListener('hashchange', pintar);
    pintar();
  }

  return { registrar: registrar, iniciar: iniciar };
})();
