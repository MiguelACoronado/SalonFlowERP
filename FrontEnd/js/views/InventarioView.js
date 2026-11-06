/* VISTA · Inventario: stock con ajuste rápido y formulario de nuevo producto. */
SF.views.Inventario = {
  render: function (root, vm, h) {
    var ui = SF.views.ui, esc = SF.util.esc;

    var filas = vm.productos.map(function (p) {
      var bajo = p.estado === 'Stock bajo';
      return '<tr><td>' + esc(p.nombre) + '</td><td>' + esc(p.categoria) + '</td>' +
        '<td><span class="stock-ctl"><button class="btn-mini" data-id="' + p.id + '" data-delta="-1" aria-label="Restar una unidad de ' + esc(p.nombre) + '">−</button>' +
        '<b>' + p.stock + '</b>' +
        '<button class="btn-mini" data-id="' + p.id + '" data-delta="1" aria-label="Sumar una unidad de ' + esc(p.nombre) + '">+</button></span></td>' +
        '<td>' + p.minimo + '</td><td>' + ui.etiqueta(p.estado, bajo ? 'low' : 'ok') + '</td></tr>';
    }).join('');

    root.innerHTML =
      ui.encabezado('Inventario', 'Stock de productos e insumos.', '<button class="btn-primary" id="btnNuevo">+ Nuevo producto</button>') +
      '<div class="table-wrap"><table><thead><tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Mínimo</th><th>Estado</th></tr></thead><tbody>' + filas + '</tbody></table></div>' +
      '<p class="nota">Un producto pasa a «Stock bajo» cuando su stock es igual o menor al mínimo.</p>';

    root.querySelector('#btnNuevo').addEventListener('click', h.onNuevo);
    root.querySelectorAll('button[data-delta]').forEach(function (b) {
      b.addEventListener('click', function () { h.onAjustar(Number(b.dataset.id), Number(b.dataset.delta)); });
    });
  },

  formulario: function (vm, alEnviar) {
    SF.views.ui.formulario({
      titulo: 'Nuevo producto',
      boton: 'Guardar producto',
      alEnviar: alEnviar,
      campos: [
        { nombre: 'nombre',    etiqueta: 'Producto',  requerido: true },
        { nombre: 'categoria', etiqueta: 'Categoría', tipo: 'select', opciones: vm.categorias },
        { nombre: 'stock',     etiqueta: 'Stock inicial', tipo: 'number', requerido: true, min: 0 },
        { nombre: 'minimo',    etiqueta: 'Stock mínimo',  tipo: 'number', requerido: true, min: 0 }
      ]
    });
  }
};
