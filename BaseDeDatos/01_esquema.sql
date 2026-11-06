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
