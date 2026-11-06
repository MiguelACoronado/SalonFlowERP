-- =====================================================================
-- SalonFlow ERP · Datos de prueba
-- Reproduce FrontEnd/js/data/mockData.js. Las fechas son relativas a hoy
-- (CURRENT_DATE), así la demo siempre muestra "la agenda de hoy" y los
-- mismos clientes inactivos, sin importar el día en que se ejecute.
-- Ejecutar después de 01_esquema.sql.
-- =====================================================================

TRUNCATE usuarios, movimientos_inventario, productos, categorias_producto,
         citas, clientes, servicios, estilistas, configuracion
         RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------
-- Parámetros
-- ---------------------------------------------------------------------
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('tasa_comision',    30, 'Porcentaje de comisión sobre el precio del servicio (opciones en la UI: 20-40)'),
  ('franjas_por_dia',  10, 'Citas que puede atender un estilista en un día (de 9:00 a 18:00, una por hora)'),
  ('dias_inactividad', 30, 'Días sin visitar a partir de los cuales se sugiere reactivar al cliente');

-- ---------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------
INSERT INTO estilistas (nombre) VALUES
  ('Héctor Figueroa'), ('Valeri Atuesta'), ('Miguel Coronado');

-- Usuarios de prueba (contraseñas solo para la demo; cambiarlas en producción)
--   admin@salonflow.co      / Admin123*
--   recepcion@salonflow.co  / Recepcion123*
--   hector@salonflow.co     / Estilista123*   (estilista: Héctor Figueroa)
--   valeri@salonflow.co     / Estilista123*   (estilista: Valeri Atuesta)
--   miguel@salonflow.co     / Estilista123*   (estilista: Miguel Coronado)
INSERT INTO usuarios (nombre, email, password_hash, rol, estilista_id) VALUES
  ('Administrador', 'admin@salonflow.co',     '$2b$10$yQm/drN2K8SVHjyyhZ1ETegTu88cwmw7nwJIrQbQn/ur5xhBQXzKm', 'admin',     NULL),
  ('Recepción',     'recepcion@salonflow.co', '$2b$10$g2vNM9XIAnWEdbviOd89IuvNKGg8bHtqJwx0pXwWxArcHCTAENk62', 'recepcion', NULL),
  ('Héctor Figueroa', 'hector@salonflow.co',  '$2b$10$UEeqTUCIjuPvT4jebWGmh.46/SXHg8J1jyhwChICgJEXRbWbBLtJC', 'estilista', 1),
  ('Valeri Atuesta',  'valeri@salonflow.co',  '$2b$10$UEeqTUCIjuPvT4jebWGmh.46/SXHg8J1jyhwChICgJEXRbWbBLtJC', 'estilista', 2),
  ('Miguel Coronado', 'miguel@salonflow.co',  '$2b$10$UEeqTUCIjuPvT4jebWGmh.46/SXHg8J1jyhwChICgJEXRbWbBLtJC', 'estilista', 3);

INSERT INTO servicios (nombre, precio) VALUES
  ('Corte clásico',    25000),
  ('Corte + barba',    40000),
  ('Afeitado',         18000),
  ('Tinte',            70000),
  ('Lavado y peinado', 20000);

INSERT INTO categorias_producto (nombre) VALUES
  ('Styling'), ('Coloración'), ('Insumos'), ('Cuidado');

INSERT INTO productos (nombre, categoria_id, stock, minimo)
SELECT p.nombre, cp.id, p.stock, p.minimo
FROM (VALUES
  (1, 'Cera moldeadora',      'Styling',    18,  8),
  (2, 'Tinte castaño',        'Coloración',  2,  5),
  (3, 'Cuchillas de afeitar', 'Insumos',     4, 10),
  (4, 'Shampoo profesional',  'Cuidado',    25, 10),
  (5, 'Gel fijador',          'Styling',     3,  6),
  (6, 'Aceite para barba',    'Cuidado',    12,  6)
) AS p(orden, nombre, categoria, stock, minimo)
JOIN categorias_producto cp ON cp.nombre = p.categoria
ORDER BY p.orden;

-- ---------------------------------------------------------------------
-- Clientes
-- Los 6 primeros son los del prototipo. "dias" = días desde su última
-- visita (en el mock, respecto al 21-sep: Laura 19, Andrés 24, Camila 37,
-- Julián 11, Sofía 53, Daniel 5). Los demás son clientes habituales
-- adicionales para que el historial y los reportes tengan volumen.
-- ---------------------------------------------------------------------
CREATE TEMP TABLE _clientes_seed (orden SERIAL, nombre TEXT, telefono TEXT, frecuente TEXT, dias INT);
INSERT INTO _clientes_seed (nombre, telefono, frecuente, dias) VALUES
  ('Laura Gómez',      '300 123 4567', 'Corte + barba',    19),
  ('Andrés Ruiz',      '301 987 6543', 'Corte clásico',    24),
  ('Camila Torres',    '315 456 7890', 'Tinte',            37),
  ('Julián Peña',      '310 222 3344', 'Afeitado',         11),
  ('Sofía Marín',      '320 555 1122', 'Lavado y peinado', 53),
  ('Daniel Castro',    '311 808 9090', 'Corte clásico',     5),
  ('Mateo Rincón',     '312 401 7781', 'Corte clásico',  NULL),
  ('Valentina Rojas',  '314 662 0193', 'Tinte',          NULL),
  ('Santiago León',    '316 230 4471', 'Corte + barba',  NULL),
  ('Paula Herrera',    '318 975 3302', 'Lavado y peinado', NULL),
  ('Felipe Cárdenas',  '305 118 2290', 'Corte clásico',  NULL),
  ('Natalia Suárez',   '317 640 8815', 'Tinte',          NULL),
  ('Juan Pablo Díaz',  '313 509 6627', 'Corte + barba',  NULL),
  ('Mariana Ospina',   '319 284 1150', 'Corte clásico',  NULL),
  ('Sebastián Vargas', '304 733 9024', 'Afeitado',       NULL),
  ('Daniela Moreno',   '321 196 4408', 'Corte clásico',  NULL);

INSERT INTO clientes (nombre, telefono, servicio_frecuente_id)
SELECT c.nombre, c.telefono, s.id
FROM _clientes_seed c JOIN servicios s ON s.nombre = c.frecuente
ORDER BY c.orden;

-- ---------------------------------------------------------------------
-- Historial de los últimos 90 días (citas atendidas y algunas canceladas)
-- Se genera de forma determinista: la ocupación de cada día de la semana
-- sigue la del mock (sábado alto, domingo bajo) y varía según la hora. Un cliente del prototipo
-- solo aparece antes de su última visita para respetar su fecha.
-- ---------------------------------------------------------------------
INSERT INTO citas (fecha, hora, cliente_id, servicio_id, estilista_id, estado)
SELECT s.fecha,
       make_time(s.h, 0, 0),
       cli.id,
       CASE WHEN s.hsh % 10 < 6 THEN cli.servicio_frecuente_id
            ELSE (s.hsh / 10) % 5 + 1 END,
       s.estilista_id,
       CASE WHEN s.hsh % 17 = 0 THEN 'Cancelada' ELSE 'Atendida' END
FROM (
    SELECT d::date AS fecha, e.id AS estilista_id, h,
           abs(hashtext(d::date || '-' || e.id || '-' || h)) AS hsh
    FROM generate_series(CURRENT_DATE - 90, CURRENT_DATE - 1, interval '1 day') d
    CROSS JOIN estilistas e
    CROSS JOIN generate_series(9, 18) h
) s
CROSS JOIN LATERAL (
    SELECT cl.id, cl.servicio_frecuente_id
    FROM clientes cl
    JOIN _clientes_seed cs ON cs.nombre = cl.nombre
    WHERE cs.dias IS NULL OR s.fecha < CURRENT_DATE - cs.dias
    ORDER BY abs(hashtext(cl.id || '-' || s.hsh))
    LIMIT 1
) cli
-- Probabilidad de ocupación = factor del día de la semana × factor de la hora
-- (pico a las 11:00 y a las 17:00, valle después del almuerzo).
WHERE (s.hsh / 100) % 100 <
      (ARRAY[45, 52, 58, 63, 78, 92, 30])[extract(isodow FROM s.fecha)::int]
    * (ARRAY[70, 95, 115, 105, 70, 55, 60, 110, 130, 100])[s.h - 8] / 100;

-- Última visita exacta de los clientes del prototipo (primer horario libre de ese día).
INSERT INTO citas (fecha, hora, cliente_id, servicio_id, estilista_id, estado)
SELECT CURRENT_DATE - cs.dias, libre.hora, cl.id, cl.servicio_frecuente_id, libre.estilista_id, 'Atendida'
FROM _clientes_seed cs
JOIN clientes cl ON cl.nombre = cs.nombre
CROSS JOIN LATERAL (
    SELECT e.id AS estilista_id, make_time(h, 0, 0) AS hora
    FROM estilistas e CROSS JOIN generate_series(9, 18) h
    WHERE NOT EXISTS (
        SELECT 1 FROM citas c
        WHERE c.estilista_id = e.id AND c.fecha = CURRENT_DATE - cs.dias
          AND c.hora = make_time(h, 0, 0) AND c.estado <> 'Cancelada')
    ORDER BY h, e.id
    LIMIT 1
) libre
WHERE cs.dias IS NOT NULL;

-- ---------------------------------------------------------------------
-- Agenda de hoy (igual a mockData.citas)
-- ---------------------------------------------------------------------
INSERT INTO citas (fecha, hora, cliente_id, servicio_id, estilista_id, estado)
SELECT CURRENT_DATE, a.hora::time, cl.id, s.id, e.id, a.estado
FROM (VALUES
  ('09:00', 'Laura Gómez',   'Corte + barba',    'Héctor Figueroa', 'Confirmada'),
  ('10:30', 'Andrés Ruiz',   'Corte clásico',    'Valeri Atuesta',  'Pendiente'),
  ('11:15', 'Camila Torres', 'Tinte',            'Miguel Coronado', 'Confirmada'),
  ('13:00', 'Julián Peña',   'Afeitado',         'Héctor Figueroa', 'Pendiente'),
  ('15:30', 'Daniel Castro', 'Corte clásico',    'Valeri Atuesta',  'Confirmada'),
  ('17:00', 'Sofía Marín',   'Lavado y peinado', 'Miguel Coronado', 'Pendiente')
) AS a(hora, cliente, servicio, estilista, estado)
JOIN clientes   cl ON cl.nombre = a.cliente
JOIN servicios  s  ON s.nombre  = a.servicio
JOIN estilistas e  ON e.nombre  = a.estilista
ORDER BY a.hora;

DROP TABLE _clientes_seed;
