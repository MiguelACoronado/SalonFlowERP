-- =====================================================================
-- SalonFlow ERP · Instalación completa en Supabase  (ARCHIVO GENERADO)
-- No editar a mano: se genera con BaseDeDatos/supabase/generar.sh
-- Pegar TODO este archivo en Supabase > SQL Editor > New query > Run.
-- Crea tablas, vistas, funciones, seguridad y datos de prueba.
-- Se puede volver a ejecutar: borra y recrea todo (¡también los datos!).
-- =====================================================================

-- Fechas en hora de Colombia (Supabase usa UTC por defecto).
ALTER DATABASE postgres SET timezone TO 'America/Bogota';
SET timezone TO 'America/Bogota';

-- =====================================================================
-- SalonFlow ERP · Esquema de base de datos (PostgreSQL 14+)
-- Compatible con Supabase (RLS activado, vistas security_invoker).
-- Cubre usuarios y roles, citas, clientes, inventario, comisiones y reportes.
-- El script se puede volver a ejecutar: borra y recrea todos los objetos.
-- =====================================================================

DROP FUNCTION IF EXISTS fn_recomendaciones(DATE) CASCADE;  -- versión anterior (módulo de IA retirado)
DROP FUNCTION IF EXISTS fn_ocupacion_semanal(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS fn_servicios_populares(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS fn_reporte_resumen(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS fn_comisiones(DATE, DATE) CASCADE;
DROP TABLE IF EXISTS usuarios, movimientos_inventario, productos, categorias_producto,
                     citas, clientes, servicios, estilistas, configuracion CASCADE;
DROP FUNCTION IF EXISTS trg_citas_precio() CASCADE;
DROP FUNCTION IF EXISTS trg_movimiento_aplicar() CASCADE;

-- ---------------------------------------------------------------------
-- Parámetros del negocio (reemplazan constantes del código JS)
-- ---------------------------------------------------------------------
CREATE TABLE configuracion (
    clave        VARCHAR(40) PRIMARY KEY,
    valor        NUMERIC     NOT NULL,
    descripcion  TEXT
);

-- ---------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------
CREATE TABLE estilistas (
    id      SERIAL       PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL UNIQUE,
    activo  BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------
-- Usuarios y roles (RF-01). La contraseña se guarda como hash bcrypt.
--   admin      → todo el sistema
--   recepcion  → clientes, citas, inventario y consultas
--   estilista  → solo su agenda (debe estar vinculado a un estilista)
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id             SERIAL       PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL,
    password_hash  VARCHAR(100) NOT NULL,
    rol            VARCHAR(12)  NOT NULL CHECK (rol IN ('admin', 'recepcion', 'estilista')),
    estilista_id   INT          UNIQUE REFERENCES estilistas(id),
    activo         BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_usuarios_estilista CHECK (rol <> 'estilista' OR estilista_id IS NOT NULL)
);
CREATE UNIQUE INDEX ux_usuarios_email ON usuarios (lower(email));

CREATE TABLE servicios (
    id      SERIAL        PRIMARY KEY,
    nombre  VARCHAR(100)  NOT NULL UNIQUE,
    precio  NUMERIC(12,2) NOT NULL CHECK (precio > 0),
    activo  BOOLEAN       NOT NULL DEFAULT TRUE
);

CREATE TABLE categorias_producto (
    id      SERIAL      PRIMARY KEY,
    nombre  VARCHAR(60) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- Clientes
-- La última visita NO se guarda: se calcula desde las citas atendidas
-- (ver vista v_clientes), así nunca queda desactualizada.
-- ---------------------------------------------------------------------
CREATE TABLE clientes (
    id                     SERIAL       PRIMARY KEY,
    nombre                 VARCHAR(120) NOT NULL CHECK (trim(nombre) <> ''),
    telefono               VARCHAR(20)  NOT NULL,
    servicio_frecuente_id  INT          REFERENCES servicios(id) ON DELETE SET NULL,
    creado_en              TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Equivale a Cliente.existe(): no se permiten dos clientes con el mismo nombre
-- (sin distinguir mayúsculas ni espacios al inicio/final).
CREATE UNIQUE INDEX ux_clientes_nombre ON clientes (lower(trim(nombre)));

-- ---------------------------------------------------------------------
-- Citas
-- Estados del prototipo: Pendiente, Confirmada, Cancelada.
-- Se agrega 'Atendida': la cita realizada es la venta del servicio y es
-- la base de comisiones y reportes.
-- ---------------------------------------------------------------------
CREATE TABLE citas (
    id            SERIAL        PRIMARY KEY,
    fecha         DATE          NOT NULL,
    hora          TIME          NOT NULL,
    cliente_id    INT           NOT NULL REFERENCES clientes(id),
    servicio_id   INT           NOT NULL REFERENCES servicios(id),
    estilista_id  INT           NOT NULL REFERENCES estilistas(id),
    estado        VARCHAR(12)   NOT NULL DEFAULT 'Pendiente'
                  CHECK (estado IN ('Pendiente', 'Confirmada', 'Atendida', 'Cancelada')),
    precio        NUMERIC(12,2) NOT NULL CHECK (precio >= 0),  -- precio cobrado (copia del servicio)
    creado_en     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
-- Regla de negocio "0 citas cruzadas" (Cita.hayConflicto):
-- un estilista no puede tener dos citas activas el mismo día a la misma hora.
-- Las canceladas no bloquean el horario.
CREATE UNIQUE INDEX ux_citas_sin_cruce
    ON citas (estilista_id, fecha, hora)
    WHERE estado <> 'Cancelada';
CREATE INDEX ix_citas_fecha   ON citas (fecha);
CREATE INDEX ix_citas_cliente ON citas (cliente_id);

-- Si no se envía precio, se toma el precio vigente del servicio.
CREATE FUNCTION trg_citas_precio() RETURNS trigger AS $$
BEGIN
    IF NEW.precio IS NULL THEN
        SELECT precio INTO NEW.precio FROM servicios WHERE id = NEW.servicio_id;
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER citas_precio
    BEFORE INSERT ON citas
    FOR EACH ROW EXECUTE FUNCTION trg_citas_precio();

-- ---------------------------------------------------------------------
-- Inventario
-- ---------------------------------------------------------------------
CREATE TABLE productos (
    id            SERIAL       PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL UNIQUE,
    categoria_id  INT          NOT NULL REFERENCES categorias_producto(id),
    stock         INT          NOT NULL DEFAULT 0 CHECK (stock >= 0),
    minimo        INT          NOT NULL DEFAULT 0 CHECK (minimo >= 0)
);

-- Cada ajuste de stock (Producto.ajustar) queda registrado.
CREATE TABLE movimientos_inventario (
    id           SERIAL      PRIMARY KEY,
    producto_id  INT         NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad     INT         NOT NULL CHECK (cantidad <> 0),   -- + entra, - sale
    motivo       VARCHAR(20) NOT NULL DEFAULT 'Ajuste'
                 CHECK (motivo IN ('Ajuste', 'Compra', 'Consumo')),
    fecha        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_movimientos_producto ON movimientos_inventario (producto_id);

-- Al insertar un movimiento se actualiza el stock. Igual que en el prototipo
-- (Math.max(0, ...)) el stock nunca baja de 0: si la salida es mayor que el
-- stock, se registra solo lo que realmente salió; si no hay nada que mover,
-- el movimiento se descarta.
CREATE FUNCTION trg_movimiento_aplicar() RETURNS trigger AS $$
DECLARE
    actual INT;
BEGIN
    SELECT stock INTO actual FROM productos WHERE id = NEW.producto_id FOR UPDATE;
    IF actual IS NULL THEN
        RAISE EXCEPTION 'Producto % no existe', NEW.producto_id;
    END IF;
    IF actual + NEW.cantidad < 0 THEN
        NEW.cantidad := -actual;
    END IF;
    IF NEW.cantidad = 0 THEN
        RETURN NULL;
    END IF;
    UPDATE productos SET stock = stock + NEW.cantidad WHERE id = NEW.producto_id;
    RETURN NEW;
END $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER movimiento_aplicar
    BEFORE INSERT ON movimientos_inventario
    FOR EACH ROW EXECUTE FUNCTION trg_movimiento_aplicar();

-- =====================================================================
-- VISTAS (lecturas que usan las pantallas)
-- =====================================================================

-- Agenda (CitasView): citas con nombres legibles.
CREATE VIEW v_citas WITH (security_invoker = true) AS
SELECT c.id, c.fecha, c.hora,
       cl.nombre AS cliente, s.nombre AS servicio, e.nombre AS estilista,
       c.estado, c.precio,
       c.cliente_id, c.servicio_id, c.estilista_id
FROM citas c
JOIN clientes   cl ON cl.id = c.cliente_id
JOIN servicios  s  ON s.id  = c.servicio_id
JOIN estilistas e  ON e.id  = c.estilista_id;

-- Clientes (ClientesView) con última visita calculada.
CREATE VIEW v_clientes WITH (security_invoker = true) AS
SELECT cl.id, cl.nombre, cl.telefono,
       s.nombre AS servicio_frecuente,
       uv.ultima_visita,
       CURRENT_DATE - uv.ultima_visita AS dias_sin_visita
FROM clientes cl
LEFT JOIN servicios s ON s.id = cl.servicio_frecuente_id
LEFT JOIN LATERAL (
    SELECT max(fecha) AS ultima_visita
    FROM citas
    WHERE cliente_id = cl.id AND estado = 'Atendida'
) uv ON TRUE;

-- Inventario (InventarioView) con el estado calculado (Producto.estado).
CREATE VIEW v_productos WITH (security_invoker = true) AS
SELECT p.id, p.nombre, cp.nombre AS categoria, p.stock, p.minimo,
       CASE WHEN p.stock <= p.minimo THEN 'Stock bajo' ELSE 'Disponible' END AS estado
FROM productos p
JOIN categorias_producto cp ON cp.id = p.categoria_id;

-- =====================================================================
-- FUNCIONES DE REPORTE (reciben un rango de fechas)
-- Por defecto: los últimos 30 días hasta ayer.
-- =====================================================================

-- Comisiones (Comision.calcular): producción y comisión por estilista
-- usando la tasa guardada en configuracion ('tasa_comision').
CREATE FUNCTION fn_comisiones(
    p_desde DATE DEFAULT CURRENT_DATE - 30,
    p_hasta DATE DEFAULT CURRENT_DATE - 1)
RETURNS TABLE (estilista VARCHAR, servicios BIGINT, total NUMERIC, tasa NUMERIC, comision NUMERIC)
LANGUAGE sql STABLE SET search_path = public AS $$
    WITH t AS (SELECT valor FROM configuracion WHERE clave = 'tasa_comision')
    SELECT e.nombre,
           count(c.id),
           coalesce(sum(c.precio), 0),
           t.valor,
           round(coalesce(sum(c.precio), 0) * t.valor / 100, 2)
    FROM estilistas e
    CROSS JOIN t
    LEFT JOIN citas c ON c.estilista_id = e.id
                     AND c.estado = 'Atendida'
                     AND c.fecha BETWEEN p_desde AND p_hasta
    WHERE e.activo
    GROUP BY e.id, e.nombre, t.valor
    ORDER BY e.id;
$$;

-- Indicadores (Reporte.ingresosMes, serviciosRealizados, ticketPromedio).
CREATE FUNCTION fn_reporte_resumen(
    p_desde DATE DEFAULT CURRENT_DATE - 30,
    p_hasta DATE DEFAULT CURRENT_DATE - 1)
RETURNS TABLE (ingresos NUMERIC, servicios_realizados BIGINT, ticket_promedio NUMERIC)
LANGUAGE sql STABLE SET search_path = public AS $$
    SELECT coalesce(sum(precio), 0),
           count(*),
           round(coalesce(avg(precio), 0), 0)
    FROM citas
    WHERE estado = 'Atendida' AND fecha BETWEEN p_desde AND p_hasta;
$$;

-- Servicios más pedidos (Reporte.serviciosPopulares / servicioTop).
CREATE FUNCTION fn_servicios_populares(
    p_desde DATE DEFAULT CURRENT_DATE - 30,
    p_hasta DATE DEFAULT CURRENT_DATE - 1)
RETURNS TABLE (servicio VARCHAR, cantidad BIGINT)
LANGUAGE sql STABLE SET search_path = public AS $$
    SELECT s.nombre, count(c.id)
    FROM servicios s
    LEFT JOIN citas c ON c.servicio_id = s.id
                     AND c.estado = 'Atendida'
                     AND c.fecha BETWEEN p_desde AND p_hasta
    GROUP BY s.id, s.nombre
    ORDER BY count(c.id) DESC, s.nombre;
$$;

-- Ocupación por día de la semana (Reporte.ocupacion / diaTop):
-- citas no canceladas / (días de ese tipo × estilistas activos × franjas por día).
CREATE FUNCTION fn_ocupacion_semanal(
    p_desde DATE DEFAULT CURRENT_DATE - 28,
    p_hasta DATE DEFAULT CURRENT_DATE - 1)
RETURNS TABLE (num_dia INT, dia TEXT, pct NUMERIC)
LANGUAGE sql STABLE SET search_path = public AS $$
    WITH dias AS (
        SELECT extract(isodow FROM d)::int AS num_dia, count(*) AS n
        FROM generate_series(p_desde, p_hasta, interval '1 day') d
        GROUP BY 1
    ), capacidad AS (
        SELECT (SELECT count(*) FROM estilistas WHERE activo)
             * (SELECT valor FROM configuracion WHERE clave = 'franjas_por_dia') AS por_dia
    ), usadas AS (
        SELECT extract(isodow FROM fecha)::int AS num_dia, count(*) AS n
        FROM citas
        WHERE estado <> 'Cancelada' AND fecha BETWEEN p_desde AND p_hasta
        GROUP BY 1
    )
    SELECT d.num_dia,
           (ARRAY['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'])[d.num_dia],
           round(100.0 * coalesce(u.n, 0) / nullif(d.n * c.por_dia, 0), 0)
    FROM dias d
    CROSS JOIN capacidad c
    LEFT JOIN usadas u USING (num_dia)
    ORDER BY d.num_dia;
$$;

-- =====================================================================
-- SEGURIDAD (Supabase)
-- Supabase publica las tablas de "public" en su API REST. Con RLS activado
-- y sin políticas, la clave pública (anon) NO puede leer ni escribir nada:
-- solo el backend (API REST con la cadena de conexión o la service_role key)
-- accede a los datos; los permisos por rol los controla la API con JWT.
-- =====================================================================
ALTER TABLE usuarios               ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion          ENABLE ROW LEVEL SECURITY;
ALTER TABLE estilistas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios              ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_producto    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

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
