-- =====================================================================
-- SalonFlow ERP · Consultas por funcionalidad
-- Cada bloque corresponde a un método de los modelos de FrontEnd/js/models.
-- Los parámetros $1, $2... son los que enviaría la API (consultas
-- parametrizadas: nunca concatenar texto del usuario en el SQL).
-- =====================================================================

-- ------------------------------ CATÁLOGO ------------------------------
-- Catalogo.estilistas()
SELECT id, nombre FROM estilistas WHERE activo ORDER BY id;
-- Catalogo.servicios()
SELECT id, nombre, precio FROM servicios WHERE activo ORDER BY id;
-- Catalogo.categorias()
SELECT id, nombre FROM categorias_producto ORDER BY id;

-- ------------------------------- CITAS --------------------------------
-- Cita.all() / Cita.byEstilista(estilista)  ($1 = fecha, $2 = estilista_id o NULL para todos)
SELECT * FROM v_citas
WHERE fecha = $1 AND ($2::int IS NULL OR estilista_id = $2)
ORDER BY hora;

-- Cita.hayConflicto(estilista, hora)  ($1 = estilista_id, $2 = fecha, $3 = hora)
-- (el índice ux_citas_sin_cruce también lo impide al insertar)
SELECT EXISTS (
    SELECT 1 FROM citas
    WHERE estilista_id = $1 AND fecha = $2 AND hora = $3 AND estado <> 'Cancelada'
) AS hay_conflicto;

-- Cita.add(datos)  ($1 fecha, $2 hora, $3 cliente_id, $4 servicio_id, $5 estilista_id)
-- El estado inicia en 'Pendiente' y el precio se copia del servicio.
INSERT INTO citas (fecha, hora, cliente_id, servicio_id, estilista_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING id;

-- Cita.setEstado(id, estado)  ($1 = id, $2 = 'Confirmada' | 'Cancelada' | 'Atendida')
UPDATE citas SET estado = $2 WHERE id = $1 RETURNING id, estado;

-- Cita.activas() / Cita.pendientes()  ($1 = fecha)
SELECT count(*) FILTER (WHERE estado <> 'Cancelada') AS activas,
       count(*) FILTER (WHERE estado = 'Pendiente')  AS pendientes
FROM citas WHERE fecha = $1;

-- ------------------------------ CLIENTES ------------------------------
-- Cliente.all()
SELECT * FROM v_clientes ORDER BY nombre;

-- Cliente.buscar(texto)  ($1 = texto; busca por nombre o teléfono ignorando espacios)
SELECT * FROM v_clientes
WHERE nombre ILIKE '%' || trim($1) || '%'
   OR replace(telefono, ' ', '') LIKE '%' || replace($1, ' ', '') || '%'
ORDER BY nombre;

-- Cliente.existe(nombre)  ($1 = nombre)
SELECT EXISTS (SELECT 1 FROM clientes WHERE lower(trim(nombre)) = lower(trim($1))) AS existe;

-- Cliente.add(datos)  ($1 nombre, $2 teléfono, $3 servicio_frecuente_id)
INSERT INTO clientes (nombre, telefono, servicio_frecuente_id)
VALUES (trim($1), $2, $3)
RETURNING id;

-- Cliente.total()
SELECT count(*) AS total FROM clientes;

-- Cliente.inactivos(dias)  ($1 = días)
SELECT * FROM v_clientes WHERE dias_sin_visita > $1 ORDER BY dias_sin_visita DESC;

-- ----------------------------- INVENTARIO -----------------------------
-- Producto.all() (incluye Producto.estado)
SELECT * FROM v_productos ORDER BY id;

-- Producto.bajos()
SELECT * FROM v_productos WHERE estado = 'Stock bajo' ORDER BY id;

-- Producto.add(datos)  ($1 nombre, $2 categoria_id, $3 stock, $4 mínimo)
INSERT INTO productos (nombre, categoria_id, stock, minimo)
VALUES ($1, $2, $3, $4)
RETURNING id;

-- Producto.ajustar(id, delta)  ($1 = producto_id, $2 = +1 / -1 ...)
-- El trigger actualiza el stock y lo deja en 0 como mínimo.
INSERT INTO movimientos_inventario (producto_id, cantidad, motivo)
VALUES ($1, $2, 'Ajuste');
SELECT * FROM v_productos WHERE id = $1;

-- ----------------------------- COMISIONES -----------------------------
-- Comision.tasa() / Comision.setTasa(t)  ($1 = nueva tasa)
SELECT valor AS tasa FROM configuracion WHERE clave = 'tasa_comision';
UPDATE configuracion SET valor = $1 WHERE clave = 'tasa_comision';

-- Comision.calcular()  (filas por estilista + totales)  ($1 desde, $2 hasta)
SELECT * FROM fn_comisiones($1, $2);
SELECT sum(servicios) AS servicios, sum(total) AS total, sum(comision) AS comision
FROM fn_comisiones($1, $2);

-- ------------------------------ REPORTES ------------------------------
-- Reporte.ingresosMes(), serviciosRealizados(), ticketPromedio()
SELECT * FROM fn_reporte_resumen($1, $2);
-- Reporte.serviciosPopulares() / servicioTop()
SELECT * FROM fn_servicios_populares($1, $2);
SELECT * FROM fn_servicios_populares($1, $2) LIMIT 1;
-- Reporte.ocupacion() / diaTop()
SELECT * FROM fn_ocupacion_semanal($1, $2);
SELECT * FROM fn_ocupacion_semanal($1, $2) ORDER BY pct DESC LIMIT 1;
