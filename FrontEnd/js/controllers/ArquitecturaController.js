/* CONTROLADOR · Arquitectura: entrega a la vista el mapa de módulos y la estructura del proyecto. */
SF.controllers.Arquitectura = {
  mostrar: function (root) {
    SF.views.Arquitectura.render(root, {
      modulos: [
        { modulo: 'Inicio',      vista: 'InicioView.js',      controlador: 'InicioController.js',      modelo: 'Todos (resumen)' },
        { modulo: 'Citas',       vista: 'CitasView.js',       controlador: 'CitasController.js',       modelo: 'Cita.js' },
        { modulo: 'Clientes',    vista: 'ClientesView.js',    controlador: 'ClientesController.js',    modelo: 'Cliente.js' },
        { modulo: 'Inventario',  vista: 'InventarioView.js',  controlador: 'InventarioController.js',  modelo: 'Producto.js' },
        { modulo: 'Comisiones',  vista: 'ComisionesView.js',  controlador: 'ComisionesController.js',  modelo: 'Comision.js' },
        { modulo: 'Reportes',    vista: 'ReportesView.js',    controlador: 'ReportesController.js',    modelo: 'Reporte.js' },
        { modulo: 'Recomendaciones IA', vista: 'IAView.js',   controlador: 'IAController.js',          modelo: 'Recomendacion.js' }
      ],
      arbol: [
        'salonflow-erp/',
        '├── index.html            Estructura base y carga de scripts',
        '├── README.md',
        '├── css/',
        '│   └── styles.css',
        '└── js/',
        '    ├── app.js            Arranque: rutas, menú y navegación',
        '    ├── core/             Router, utilidades y espacio de nombres',
        '    ├── data/             Datos de prueba',
        '    ├── models/           Modelo: estado y reglas de cada módulo',
        '    ├── views/            Vista: pantallas y componentes',
        '    └── controllers/      Controlador: coordina modelo y vista'
      ].join('\n')
    });
  }
};
