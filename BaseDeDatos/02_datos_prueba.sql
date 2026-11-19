-- =====================================================================
-- SalonFlow ERP · Datos de prueba
-- Reproduce FrontEnd/js/data/mockData.js. Las fechas son relativas a hoy
-- (CURRENT_DATE), así la demo siempre muestra "la agenda de hoy" y los
-- mismos clientes inactivos, sin importar el día en que se ejecute.
-- Ejecutar después de 01_esquema.sql.
-- =====================================================================

TRUNCATE prediccion_riesgo, usuarios, movimientos_inventario, productos, categorias_producto,
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
-- Cada cliente tiene un "ritmo" (cada cuántos días suele venir) y "dias"
-- (días desde su última visita). Así el historial se parece al de un salón
-- real: un cliente fijo viene cada 2 a 6 semanas, no todos los días.
--
-- Los 6 primeros son los del prototipo, con sus días sin venir del mock
-- (respecto al 21-sep: Laura 19, Andrés 24, Camila 37, Julián 11, Sofía 53,
-- Daniel 5). Sofía lleva más del doble de su ritmo sin venir: es el caso
-- de cliente en riesgo de la demo. Los 10 siguientes son clientes fijos.
-- ---------------------------------------------------------------------
CREATE TEMP TABLE _clientes_seed (orden SERIAL, nombre TEXT, telefono TEXT, frecuente TEXT, dias INT, ritmo INT);
INSERT INTO _clientes_seed (nombre, telefono, frecuente, dias, ritmo) VALUES
  ('Laura Gómez',      '300 123 4567', 'Corte + barba',    19, 21),
  ('Andrés Ruiz',      '301 987 6543', 'Corte clásico',    24, 18),
  ('Camila Torres',    '315 456 7890', 'Tinte',            37, 42),
  ('Julián Peña',      '310 222 3344', 'Afeitado',         11, 14),
  ('Sofía Marín',      '320 555 1122', 'Lavado y peinado', 53, 20),
  ('Daniel Castro',    '311 808 9090', 'Corte clásico',     5, 15),
  ('Mateo Rincón',     '312 401 7781', 'Corte clásico',     8, 16),
  ('Valentina Rojas',  '314 662 0193', 'Tinte',            20, 35),
  ('Santiago León',    '316 230 4471', 'Corte + barba',     3, 14),
  ('Paula Herrera',    '318 975 3302', 'Lavado y peinado', 12, 21),
  ('Felipe Cárdenas',  '305 118 2290', 'Corte clásico',    15, 20),
  ('Natalia Suárez',   '317 640 8815', 'Tinte',            30, 45),
  ('Juan Pablo Díaz',  '313 509 6627', 'Corte + barba',     6, 12),
  ('Mariana Ospina',   '319 284 1150', 'Corte clásico',    17, 28),
  ('Sebastián Vargas', '304 733 9024', 'Afeitado',          2, 10),
  ('Daniela Moreno',   '321 196 4408', 'Corte clásico',    22, 30);

-- 200 clientes más, generados de forma determinista (siempre los mismos).
-- Ritmo entre 10 y 45 días. Según su número: 15 % dejó de venir (lleva entre
-- 2,2 y 4 veces su ritmo sin venir), 10 % va algo atrasado (1,2 a 1,9 veces)
-- y el resto está al día. Nombres de tres palabras y teléfonos 322 … para
-- no repetir los anteriores.
INSERT INTO _clientes_seed (nombre, telefono, frecuente, dias, ritmo)
SELECT n.nombre || ' ' || a1.apellido || ' ' || a2.apellido,
       '322 ' || to_char(100 + g.i, 'FM000') || ' ' || to_char((g.i * 7919) % 10000, 'FM0000'),
       (ARRAY['Corte clásico', 'Corte clásico', 'Corte + barba', 'Corte + barba', 'Afeitado',
              'Tinte', 'Lavado y peinado', 'Corte clásico'])[g.h % 8 + 1],
       CASE WHEN g.h % 100 < 15 THEN LEAST(120, g.ritmo * (22 + g.h % 19) / 10)
            WHEN g.h % 100 < 25 THEN g.ritmo * (12 + g.h % 8) / 10
            ELSE 1 + (g.h / 100) % g.ritmo END,
       g.ritmo
FROM (SELECT i, abs(hashtext('cliente-' || i)) AS h, 10 + abs(hashtext('ritmo-' || i)) % 36 AS ritmo
      FROM generate_series(0, 199) i) g
JOIN (SELECT row_number() OVER () - 1 AS k, nombre FROM unnest(ARRAY[
        'Alejandro', 'Ana', 'Carlos', 'Carolina', 'David', 'Diana', 'Esteban', 'Gabriela',
        'Jorge', 'Isabella', 'Kevin', 'Juliana', 'Luis', 'Lorena', 'Nicolás', 'Manuela',
        'Óscar', 'Paola', 'Ricardo', 'Tatiana']) nombre) n ON n.k = g.i % 20
JOIN (SELECT row_number() OVER () - 1 AS k, apellido FROM unnest(ARRAY[
        'Acosta', 'Barrera', 'Cifuentes', 'Duarte', 'Escobar', 'Franco', 'Guerrero', 'Hurtado',
        'Jaramillo', 'Londoño', 'Mejía', 'Navarro', 'Orozco', 'Pineda', 'Quintero', 'Restrepo',
        'Salazar', 'Téllez', 'Uribe', 'Zapata']) apellido) a1 ON a1.k = (g.i / 20) % 20
JOIN (SELECT row_number() OVER () - 1 AS k, apellido FROM unnest(ARRAY[
        'Ríos', 'Castaño', 'Bermúdez', 'Cano', 'Patiño', 'Valencia', 'Arango', 'Montoya',
        'Gil', 'Ospina', 'Cardona', 'Zuluaga', 'Giraldo', 'Henao', 'Muñoz', 'Vélez',
        'Rendón', 'Agudelo', 'Bedoya', 'Correa']) apellido) a2 ON a2.k = (g.i * 7) % 20
ORDER BY g.i;

-- Todos los clientes de prueba aceptaron el aviso de privacidad 1.0 al registrarse.
INSERT INTO clientes (nombre, telefono, servicio_frecuente_id, autoriza_datos, fecha_autorizacion, version_politica)
SELECT c.nombre, c.telefono, s.id, TRUE, now() - interval '120 days', '1.0'
FROM _clientes_seed c JOIN servicios s ON s.nombre = c.frecuente
ORDER BY c.orden;

-- ---------------------------------------------------------------------
-- Historial de los últimos 210 días (citas atendidas y algunas canceladas)
-- 1. Cada cliente tiene una última visita: hoy - dias (exacta para los 16
--    clientes con nombre, que usan las pruebas y la demo).
-- 2. Hacia atrás, una visita cada "ritmo" días, con una variación de ±20 %.
-- 3. Semana de un salón de barrio: el domingo casi no se atiende y el lunes
--    es flojo, así que esas visitas se pasan al sábado (pg_temp.dia_salon).
-- 4. Cada visita ocupa una franja libre (3 estilistas × 10 horas = 30 por
--    día). Las últimas visitas tienen prioridad (primero las del prototipo),
--    así sus fechas siempre son exactas.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.dia_salon(d DATE, h BIGINT) RETURNS DATE LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE extract(isodow FROM d)::int
             WHEN 7 THEN d - 1                                    -- domingo -> sábado
             WHEN 1 THEN CASE WHEN h % 3 = 0 THEN d - 2 ELSE d END -- 1 de cada 3 lunes -> sábado
             ELSE d END
$$;

CREATE TEMP TABLE _visitas AS
SELECT cl.id AS cliente_id,
       CASE WHEN cs.orden <= 16 THEN CURRENT_DATE - cs.dias
            ELSE pg_temp.dia_salon(CURRENT_DATE - cs.dias, abs(hashtext('ultima-' || cl.id))) END AS fecha,
       CASE WHEN cs.orden <= 6 THEN 0 ELSE 1 END AS prioridad,
       cl.servicio_frecuente_id AS servicio_id, 'Atendida' AS estado,
       abs(hashtext('ultima-' || cl.id)) AS hsh
FROM _clientes_seed cs JOIN clientes cl ON cl.nombre = cs.nombre
UNION ALL
SELECT cl.id, v.fecha, 2,
       CASE WHEN v.hsh % 10 < 7 THEN cl.servicio_frecuente_id ELSE (v.hsh / 10) % 5 + 1 END,
       CASE WHEN v.hsh % 17 = 0 THEN 'Cancelada' ELSE 'Atendida' END,
       v.hsh
FROM _clientes_seed cs
JOIN clientes cl ON cl.nombre = cs.nombre
CROSS JOIN LATERAL (
    SELECT pg_temp.dia_salon(d.d0, d.hsh) AS fecha, d.hsh
    FROM (
        SELECT (CURRENT_DATE - cs.dias) - k * cs.ritmo
                 + (abs(hashtext(cl.id || '-' || k)) % (2 * (cs.ritmo / 5) + 1)) - cs.ritmo / 5 AS d0,
               abs(hashtext(cl.id || '-' || k)) AS hsh
        FROM generate_series(1, 210 / cs.ritmo + 1) k
    ) d
) v
WHERE v.fecha >= CURRENT_DATE - 210;

-- Franja n del día (1..30) -> estilista (n-1) % 3 + 1 y una hora distinta por estilista:
-- multiplicar por 7 (primo con 10) reparte las citas a lo largo del día sin repetir hora.
INSERT INTO citas (fecha, hora, cliente_id, servicio_id, estilista_id, estado)
SELECT fecha,
       make_time((9 + (((n - 1) / 3) * 7 + extract(doy FROM fecha)::int) % 10)::int, 0, 0),
       cliente_id, servicio_id, ((n - 1) % 3 + 1)::int, estado
FROM (SELECT v.*, row_number() OVER (PARTITION BY fecha ORDER BY prioridad, hsh) AS n FROM _visitas v) r
WHERE n <= 30
ORDER BY fecha, n;

DROP TABLE _visitas;

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
