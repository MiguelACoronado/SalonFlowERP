/* VISTA · Componentes reutilizables: encabezado de página, etiquetas, ventana modal y aviso. */
SF.views.ui = (function () {
  var esc = SF.util.esc;

  function encabezado(titulo, subtitulo, accionHtml) {
    return '<div class="page-head"><div><h2>' + esc(titulo) + '</h2><p>' + esc(subtitulo) + '</p></div>' +
           (accionHtml || '') + '</div>';
  }

  function etiqueta(texto, clase) {
    return '<span class="tag ' + clase + '">' + esc(texto) + '</span>';
  }

  var timer;
  function aviso(mensaje) {
    var t = document.getElementById('toast');
    t.textContent = mensaje;
    t.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* Formulario en ventana modal. campos: [{nombre, etiqueta, tipo, opciones, lista, requerido, min, max}] */
  function formulario(cfg) {
    var dlg = document.createElement('dialog');
    dlg.className = 'modal';

    var campos = cfg.campos.map(function (c) {
      var id = 'f-' + c.nombre, control;
      if (c.tipo === 'select') {
        control = '<select id="' + id + '" name="' + c.nombre + '">' +
          c.opciones.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>';
      } else {
        control = '<input id="' + id + '" name="' + c.nombre + '" type="' + (c.tipo || 'text') + '"' +
          (c.requerido ? ' required' : '') +
          (c.min !== undefined ? ' min="' + c.min + '"' : '') +
          (c.max !== undefined ? ' max="' + c.max + '"' : '') +
          (c.lista ? ' list="dl-' + c.nombre + '"' : '') + ' autocomplete="off">' +
          (c.lista ? '<datalist id="dl-' + c.nombre + '">' +
            c.lista.map(function (o) { return '<option value="' + esc(o) + '">'; }).join('') + '</datalist>' : '');
      }
      return '<label class="campo" for="' + id + '">' + esc(c.etiqueta) + control + '</label>';
    }).join('');

    dlg.innerHTML = '<form novalidate>' +
      '<h2>' + esc(cfg.titulo) + '</h2>' + campos +
      '<div class="error" role="alert"></div>' +
      '<div class="pie"><button type="button" class="btn-ghost" data-cancelar>Cancelar</button>' +
      '<button type="submit" class="btn-primary">' + esc(cfg.boton || 'Guardar') + '</button></div></form>';

    var form = dlg.querySelector('form');
    var error = dlg.querySelector('.error');

    dlg.querySelector('[data-cancelar]').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('close', function () { dlg.remove(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var valores = {};
      new FormData(form).forEach(function (v, k) { valores[k] = String(v).trim(); });
      var res = cfg.alEnviar(valores);      // El controlador decide si es válido.
      if (res && res.error) { error.textContent = res.error; return; }
      dlg.close();
    });

    document.body.appendChild(dlg);
    dlg.showModal();
    var primero = dlg.querySelector('input,select');
    if (primero) primero.focus();
  }

  return { encabezado: encabezado, etiqueta: etiqueta, aviso: aviso, formulario: formulario };
})();
