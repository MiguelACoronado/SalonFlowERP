/* Arranque de la aplicación: registro de rutas, menú lateral y navegación. */
(function (SF) {
  var C = SF.controllers;

  SF.router.registrar('inicio',       { titulo: 'Inicio',                   controlador: C.Inicio });
  SF.router.registrar('citas',        { titulo: 'Citas',                    controlador: C.Citas });
  SF.router.registrar('clientes',     { titulo: 'Clientes',                 controlador: C.Clientes });
  SF.router.registrar('inventario',   { titulo: 'Inventario',               controlador: C.Inventario });
  SF.router.registrar('comisiones',   { titulo: 'Comisiones',               controlador: C.Comisiones });
  SF.router.registrar('reportes',     { titulo: 'Reportes',                 controlador: C.Reportes });
  SF.router.registrar('ia',           { titulo: 'Recomendaciones IA',       controlador: C.IA });
  SF.router.registrar('arquitectura', { titulo: 'Arquitectura del sistema', controlador: C.Arquitectura });

  var hamburger = document.getElementById('hamburger');
  var panel = document.getElementById('navPanel');
  var overlay = document.getElementById('navOverlay');
  var enlaces = document.querySelectorAll('#nav a');
  var titulo = document.getElementById('topbarTitle');
  var migas = document.getElementById('topbarCrumb');
  var app = document.getElementById('app');

  function menu(abrir) {
    hamburger.classList.toggle('open', abrir);
    panel.classList.toggle('open', abrir);
    overlay.classList.toggle('open', abrir);
    hamburger.setAttribute('aria-expanded', String(abrir));
  }

  hamburger.addEventListener('click', function () { menu(!panel.classList.contains('open')); });
  overlay.addEventListener('click', function () { menu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu(false); });
  enlaces.forEach(function (a) { a.addEventListener('click', function () { menu(false); }); });

  SF.router.iniciar(app, function (ruta, def) {
    enlaces.forEach(function (a) { a.classList.toggle('active', a.dataset.ruta === ruta); });
    titulo.textContent = def.titulo;
    migas.textContent = 'SalonFlow ERP / ' + def.titulo;
    document.title = def.titulo + ' · SalonFlow ERP';
    menu(false);
  });
})(window.SF);
