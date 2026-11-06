/* Datos de prueba (Fase 2). Sin base de datos: viven en memoria mientras la página está abierta. */
SF.data = {
  hoy: '2026-09-21',

  estilistas: ['Héctor Figueroa', 'Valeri Atuesta', 'Miguel Coronado'],

  servicios: [
    { nombre: 'Corte clásico',    precio: 25000 },
    { nombre: 'Corte + barba',    precio: 40000 },
    { nombre: 'Afeitado',         precio: 18000 },
    { nombre: 'Tinte',            precio: 70000 },
    { nombre: 'Lavado y peinado', precio: 20000 }
  ],

  categoriasProducto: ['Styling', 'Coloración', 'Insumos', 'Cuidado'],

  citas: [
    { id: 1, hora: '09:00', cliente: 'Laura Gómez',   servicio: 'Corte + barba',    estilista: 'Héctor Figueroa', estado: 'Confirmada' },
    { id: 2, hora: '10:30', cliente: 'Andrés Ruiz',   servicio: 'Corte clásico',    estilista: 'Valeri Atuesta',  estado: 'Pendiente' },
    { id: 3, hora: '11:15', cliente: 'Camila Torres', servicio: 'Tinte',            estilista: 'Miguel Coronado', estado: 'Confirmada' },
    { id: 4, hora: '13:00', cliente: 'Julián Peña',   servicio: 'Afeitado',         estilista: 'Héctor Figueroa', estado: 'Pendiente' },
    { id: 5, hora: '15:30', cliente: 'Daniel Castro', servicio: 'Corte clásico',    estilista: 'Valeri Atuesta',  estado: 'Confirmada' },
    { id: 6, hora: '17:00', cliente: 'Sofía Marín',   servicio: 'Lavado y peinado', estilista: 'Miguel Coronado', estado: 'Pendiente' }
  ],

  clientes: [
    { id: 1, nombre: 'Laura Gómez',   telefono: '300 123 4567', ultimaVisita: '2026-09-02', servicioFrecuente: 'Corte + barba' },
    { id: 2, nombre: 'Andrés Ruiz',   telefono: '301 987 6543', ultimaVisita: '2026-08-28', servicioFrecuente: 'Corte clásico' },
    { id: 3, nombre: 'Camila Torres', telefono: '315 456 7890', ultimaVisita: '2026-08-15', servicioFrecuente: 'Tinte' },
    { id: 4, nombre: 'Julián Peña',   telefono: '310 222 3344', ultimaVisita: '2026-09-10', servicioFrecuente: 'Afeitado' },
    { id: 5, nombre: 'Sofía Marín',   telefono: '320 555 1122', ultimaVisita: '2026-07-30', servicioFrecuente: 'Lavado y peinado' },
    { id: 6, nombre: 'Daniel Castro', telefono: '311 808 9090', ultimaVisita: '2026-09-16', servicioFrecuente: 'Corte clásico' }
  ],

  productos: [
    { id: 1, nombre: 'Cera moldeadora',     categoria: 'Styling',    stock: 18, minimo: 8 },
    { id: 2, nombre: 'Tinte castaño',       categoria: 'Coloración', stock: 2,  minimo: 5 },
    { id: 3, nombre: 'Cuchillas de afeitar', categoria: 'Insumos',   stock: 4,  minimo: 10 },
    { id: 4, nombre: 'Shampoo profesional', categoria: 'Cuidado',    stock: 25, minimo: 10 },
    { id: 5, nombre: 'Gel fijador',         categoria: 'Styling',    stock: 3,  minimo: 6 },
    { id: 6, nombre: 'Aceite para barba',   categoria: 'Cuidado',    stock: 12, minimo: 6 }
  ],

  /* Producción del mes por estilista (base del módulo de comisiones) */
  produccion: [
    { estilista: 'Héctor Figueroa', servicios: 42, total: 1680000 },
    { estilista: 'Valeri Atuesta',  servicios: 36, total: 1440000 },
    { estilista: 'Miguel Coronado', servicios: 39, total: 1200000 }
  ],

  serviciosPopulares: [
    { nombre: 'Corte clásico',    cantidad: 44 },
    { nombre: 'Corte + barba',    cantidad: 31 },
    { nombre: 'Tinte',            cantidad: 17 },
    { nombre: 'Afeitado',         cantidad: 15 },
    { nombre: 'Lavado y peinado', cantidad: 10 }
  ],

  ocupacionSemanal: [
    { dia: 'Lunes', pct: 45 }, { dia: 'Martes', pct: 52 }, { dia: 'Miércoles', pct: 58 },
    { dia: 'Jueves', pct: 63 }, { dia: 'Viernes', pct: 78 }, { dia: 'Sábado', pct: 92 },
    { dia: 'Domingo', pct: 30 }
  ]
};
