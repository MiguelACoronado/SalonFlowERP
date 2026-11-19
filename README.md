# SalonFlow ERP

Plataforma web para administrar peluquerías y barberías de barrio: agenda de citas sin cruces de horario, clientes con historial, inventario con alertas de stock, comisiones por estilista y reportes. Incluye un **servicio de inteligencia artificial propio** (red neuronal con TensorFlow) que identifica a los clientes en riesgo de no volver.

**Equipo:** Hector Figueroa · Valeri Atuesta · Miguel Coronado
**Materia:** Arquitectura de Software · Universidad Manuela Beltrán

---

## Arquitectura

```mermaid
flowchart LR
    U[Usuario del salón<br/>navegador] -->|HTTPS| F[Frontend<br/>React + TypeScript]
    F -->|REST · JSON · JWT| A[API REST<br/>FastAPI · Python]
    A -->|SQLAlchemy · psycopg| D[(PostgreSQL<br/>Supabase)]
    A -->|HTTP · JSON<br/>POST /predecir| IA[Servicio de IA<br/>FastAPI + TensorFlow]
```

El backend está organizado **por capas** (cada capa solo llama a la de abajo):

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Presentación | `backend/app/routers/` | Endpoints HTTP, validación de entrada (Pydantic), permisos por rol |
| Aplicación | `backend/app/services/` | Reglas de negocio (horarios, cruces, flujo de estados, stock, llamada a la IA…) |
| Datos | `backend/app/repositories/` + `models/` | Consultas SQL y modelos ORM (SQLAlchemy) |
| Base de datos | `BaseDeDatos/` | Esquema, restricciones, triggers, vistas y funciones de reporte |
| Servicio de IA | `ia/` | Componente aparte: modelo entrenado y API de predicción |

Las reglas críticas se validan **dos veces**: en la API (mensaje claro para el usuario) y en la base de datos (garantía final). Ejemplo: el cruce de citas lo revisa `services/citas.py` y además lo impide el índice único `ux_citas_sin_cruce`.

## Estructura del repositorio

```
├── backend/                API REST (FastAPI)
│   ├── app/
│   │   ├── core/              configuración, conexión, seguridad JWT, errores, aviso de privacidad
│   │   ├── models/            modelos ORM
│   │   ├── schemas/           validación de entrada/salida (Pydantic)
│   │   ├── repositories/      acceso a datos
│   │   ├── services/          reglas de negocio · riesgo.py integra el servicio de IA
│   │   └── routers/           endpoints
│   ├── tests/              56 pruebas de integración (pytest)
│   └── .env.example        plantilla de configuración
├── ia/                     Servicio de inteligencia artificial (TensorFlow + FastAPI)
│   ├── entrenar_modelo.py     entrena la red neuronal con datos sintéticos y la evalúa
│   ├── api.py                 servicio web: GET / y POST /predecir
│   ├── preprocesamiento.py    normalización compartida por el entrenamiento y la API
│   ├── modelo_riesgo.keras    modelo entrenado (versión 1.0.0)
│   ├── metricas.json          métricas del modelo en el conjunto de prueba
│   ├── ejemplos.http          peticiones de ejemplo
│   └── tests/                 9 pruebas del servicio
├── BaseDeDatos/            Scripts SQL para PostgreSQL / Supabase
├── FrontEnd/               Interfaz web
│   ├── src/                   aplicación React + TypeScript (una página por módulo)
│   ├── dist/                  versión compilada que entrega la API
│   └── js/, css/, index.html  prototipo de la fase 2 (datos simulados, GitHub Pages)
├── docs/                   Política de tratamiento de datos personales (Ley 1581)
├── .github/workflows/      CI: pruebas del backend y de la IA en cada push; GitHub Pages
├── render.yaml             Despliegue en Render (API e IA)
└── index.html              Entrada del prototipo de la fase 2 en GitHub Pages
```

---

## Inteligencia artificial: clientes en riesgo de no volver (RF-14)

### Qué hace

La clientela de un salón de barrio es sobre todo recurrente, y un cliente fijo que deja de venir es dinero que se repetía cada pocas semanas. El servicio de IA estima, para cada cliente, la **probabilidad de que no vuelva**, y el sistema le muestra al propietario una lista corta de clientes a los que vale la pena escribir. La lista es una **sugerencia**: la decisión de contactar al cliente siempre la toma una persona.

### Tecnología

| | |
|---|---|
| Modelo | Red neuronal densa: 4 entradas → 8 (ReLU) → 4 (ReLU) → 1 (sigmoide) |
| Entrenamiento | TensorFlow 2.21 / Keras · optimizador Adam · entropía cruzada binaria |
| Publicación | FastAPI 0.165 + Uvicorn (servicio aparte, en Python 3.12) |
| Guía seguida | *Cómo crear un servicio inteligente de software con TensorFlow* (UMB) |

**Entradas** (análisis RFM, calculadas con las citas atendidas que el sistema ya registra; no se captura ningún dato nuevo):

| Entrada | Significado |
|---|---|
| `dias_desde_ultima` | Días desde la última visita (recencia) |
| `intervalo_promedio` | Días promedio entre visitas (frecuencia habitual) |
| `num_visitas` | Visitas registradas (mínimo 2) |
| `gasto_promedio` | Gasto promedio por visita, en pesos (valor monetario) |

**Salida:** probabilidad entre 0 y 1. Con 0,5 o más, el cliente se marca «en riesgo».

### Componente que hace la integración

`backend/app/services/riesgo.py`. Define la interfaz `PredictorRiesgo` y el adaptador `PredictorHttp`, que hace la petición HTTP. **Solo la API habla con el servicio de IA**: el frontend nunca lo llama directamente, así que la autenticación y los permisos siguen concentrados en la API.

### Flujo de comunicación

```mermaid
sequenceDiagram
    participant D as Dashboard (admin)
    participant A as API · services/riesgo.py
    participant BD as PostgreSQL
    participant IA as Servicio de IA

    D->>A: GET /api/v1/clientes-en-riesgo (JWT)
    A->>BD: SELECT * FROM v_indicadores_rfm
    BD-->>A: 4 indicadores por cliente (sin nombre ni teléfono)
    A->>IA: POST /predecir {clientes: [{ref, ...}]} (máx. 10 s)
    IA->>IA: valida rangos, normaliza, aplica modelo .keras
    IA-->>A: {version_modelo, resultados: [{ref, probabilidad, en_riesgo}]}
    A->>BD: INSERT INTO prediccion_riesgo (fecha de hoy)
    A-->>D: lista ordenada por probabilidad, con nombre y teléfono
```

1. **Una vez al día:** la primera consulta del día hace el cálculo, y las demás usan el resultado guardado. El administrador puede forzar un recálculo con `POST /clientes-en-riesgo/recalcular`.
2. **Datos mínimos (RN-06):** al servicio solo le llegan números y un identificador interno (`ref`). Los nombres se agregan después, dentro de la API.
3. **Tolerancia a fallos:** si el servicio de IA no responde, la API devuelve la última lista guardada con un `aviso`, y el resto del sistema sigue funcionando.
4. **Seguimiento:** cada predicción guarda las entradas, la probabilidad y la versión del modelo. El administrador marca a quién ya contactó (`PATCH /clientes-en-riesgo/{id}/contactado`).

### Cómo usa la aplicación el resultado

- `GET /api/v1/clientes-en-riesgo` entrega al **Dashboard del administrador** la lista ordenada por probabilidad, con nombre, teléfono, intervalo habitual y días sin venir. Ejemplo: *«Sofía Marín: lleva 53 días sin venir. Probabilidad de no volver: 94 %»*. Desde ahí, el administrador marca como contactado a quien ya le escribió.
- `GET /api/v1/dashboard` incluye `clientes_en_riesgo`, el número de clientes en riesgo según el último cálculo, para la tarjeta de resumen.

### Ejemplo de funcionamiento

Petición de la API al servicio de IA:

```http
POST http://127.0.0.1:8001/predecir
Content-Type: application/json

{ "clientes": [
    { "ref": 1042, "dias_desde_ultima": 63, "intervalo_promedio": 21, "num_visitas": 9, "gasto_promedio": 38000 },
    { "ref": 1077, "dias_desde_ultima": 12, "intervalo_promedio": 30, "num_visitas": 4, "gasto_promedio": 25000 } ] }
```

Respuesta real del modelo 1.0.0:

```json
{ "version_modelo": "1.0.0", "umbral": 0.5,
  "resultados": [
    { "ref": 1042, "probabilidad_no_volver": 0.881,  "en_riesgo": true  },
    { "ref": 1077, "probabilidad_no_volver": 0.0634, "en_riesgo": false } ],
  "nota": "Resultado demostrativo de un modelo entrenado con datos sintéticos. Es una sugerencia para contactar al cliente; la decisión es del propietario." }
```

Con los datos de prueba, `GET /api/v1/clientes-en-riesgo` evalúa 16 clientes y marca 5 en riesgo: Sofía Marín (94 %), Camila Torres (94 %), Andrés Ruiz (90 %), Laura Gómez (86 %) y Julián Peña (62 %). Con el servicio de IA apagado, `POST /recalcular` responde `503 «El servicio de IA no está disponible.»` y el dashboard sigue respondiendo 200.

### Evaluación del modelo

Entrenado con 3.000 clientes sintéticos (70 % entrenamiento, 15 % validación, 15 % prueba). Métricas en el conjunto de prueba (`ia/metricas.json`):

| Métrica | Red neuronal | Línea base (regla fija*) |
|---|---|---|
| Exactitud | 0,898 | 0,907 |
| Precisión | 0,892 | 0,890 |
| Recall | 0,864 | 0,890 |
| F1 | 0,878 | 0,890 |

\* Regla fija: en riesgo si lleva más del doble de su intervalo habitual sin venir.

**Limitaciones.** Las etiquetas sintéticas se generan con esa misma regla más un 8 % de ruido, así que la regla es prácticamente el máximo que se puede alcanzar con estos datos, y el modelo queda muy cerca de ella. El modelo es **demostrativo**: su ventaja real aparecerá cuando se reentrene con el historial del salón (un cliente perdido = sin visitas en los 90 días siguientes a una fecha de corte) y se versione de nuevo. Si se quiere priorizar el recall, se puede bajar el umbral (`UMBRAL_RIESGO` en `ia/preprocesamiento.py`).

---

## Cómo ejecutar

**Requisitos:** Python **3.12** (TensorFlow funciona con Python 3.10 a 3.12) y PostgreSQL 14 o superior, local o en Supabase.

### 1. Base de datos

En PostgreSQL local, ejecutar en orden `BaseDeDatos/01_esquema.sql` y `BaseDeDatos/02_datos_prueba.sql`. En Supabase, pegar `BaseDeDatos/supabase/salonflow_supabase.sql` en *SQL Editor* y ejecutarlo.

### 2. Servicio de IA (puerto 8001)

```bash
cd ia
python -m venv .venv
.venv\Scripts\activate            # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
python entrenar_modelo.py          # opcional: el modelo ya entrenado está en el repositorio
uvicorn api:app --port 8001
```

Documentación interactiva: http://127.0.0.1:8001/docs

### 3. API e interfaz (puerto 8000)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env             # macOS/Linux: cp .env.example .env  → editar DATABASE_URL y JWT_SECRET
uvicorn app.main:app --port 8000
```

- Aplicación: http://127.0.0.1:8000 (la API entrega también la interfaz compilada de `FrontEnd/dist`)
- Documentación de la API: http://127.0.0.1:8000/api/docs

### Configuración (`backend/.env`)

| Variable | Para qué | Valor por defecto |
|---|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://postgres:postgres@localhost:5432/salonflow` |
| `JWT_SECRET` | Firma de las sesiones (mínimo 32 caracteres) | *debe cambiarse* |
| `IA_URL` | Dirección del servicio de IA | `http://127.0.0.1:8001` |
| `IA_API_KEY` | Clave compartida con el servicio de IA (opcional) | vacía |
| `IA_TIMEOUT_SEGUNDOS` | Tiempo máximo de espera de la IA | `10` |
| `RESPONSABLE_NOMBRE`, `RESPONSABLE_CONTACTO` | Responsable de los datos en el aviso de privacidad | datos de la demo |

Si se define `IA_API_KEY` en el servicio de IA, este exige el encabezado `X-API-Key`. Hay que poner la misma clave en el backend.

### Usuarios de prueba

| Correo | Contraseña | Rol | Puede |
|---|---|---|---|
| admin@salonflow.co | Admin123* | Administrador | Todo, incluida la lista de clientes en riesgo |
| recepcion@salonflow.co | Recepcion123* | Recepción | Citas, clientes, inventario |
| hector@salonflow.co | Estilista123* | Estilista | Solo su agenda y su comisión |

---

## Módulos y endpoints

Todos bajo `/api/v1` y protegidos con JWT (`Authorization: Bearer <token>`), excepto el login.

| Módulo | Endpoints principales | Roles |
|---|---|---|
| Autenticación | `POST /auth/login`, `GET /auth/me` | Todos |
| Usuarios | `GET/POST /usuarios`, `PATCH /usuarios/{id}` | Admin |
| Catálogos | `GET /estilistas`, `GET/POST/PATCH /servicios`, `GET /categorias` | Todos (escritura: admin) |
| Clientes | `GET/POST /clientes`, `GET/PATCH /clientes/{id}`, `GET /clientes/{id}/historial`, `GET /clientes/aviso-privacidad` | Admin, recepción |
| Citas | `GET/POST /citas`, `GET /citas/disponibilidad`, `PATCH /citas/{id}/estado` | Todos (estilista: solo las suyas) |
| Inventario | `GET/POST /productos`, `PATCH /productos/{id}`, `GET/POST /productos/{id}/movimientos` | Admin, recepción |
| Comisiones | `GET /comisiones`, `PUT /comisiones/tasa` | Admin (estilista: solo la suya) |
| Reportes | `GET /dashboard`, `GET /reportes/resumen`, `/servicios-populares`, `/ocupacion` | Admin |
| **IA: clientes en riesgo** | `GET /clientes-en-riesgo`, `POST /clientes-en-riesgo/recalcular`, `PATCH /clientes-en-riesgo/{id}/contactado` | Admin |

Todas las respuestas de error tienen la misma forma:

```json
{ "detalle": "Valeri Atuesta ya tiene una cita a las 10:00 ese día.",
  "errores": [{ "campo": "hora", "mensaje": "Horario ocupado. Elige otra hora." }] }
```

| Código | Cuándo |
|---|---|
| 401 | Sin sesión, token inválido o vencido |
| 403 | El rol no tiene permiso |
| 404 | El registro no existe |
| 409 | Duplicado o conflicto (cliente repetido, cita cruzada) |
| 422 | Datos inválidos o regla de negocio incumplida (por ejemplo, cliente sin autorización de datos) |
| 503 | Base de datos o servicio de IA no disponible |

## Protección de datos personales

SalonFlow trata datos personales de clientes (nombre, teléfono e historial), por eso aplica la **Ley 1581 de 2012**. La política completa está en [`docs/politica_tratamiento_datos.md`](docs/politica_tratamiento_datos.md).

- **Autorización previa (art. 9):** `POST /clientes` exige `"autoriza_datos": true`. Se guardan la fecha y la versión del aviso aceptado como prueba, y la base de datos rechaza una autorización sin ellas.
- **Aviso de privacidad (art. 12):** `GET /clientes/aviso-privacidad` entrega el texto que se le muestra al cliente, con las finalidades (incluido el análisis con IA) y el almacenamiento fuera de Colombia.
- **Revocatoria (art. 8):** `PATCH /clientes/{id}` con `"autoriza_datos": false` saca al cliente del análisis de IA y borra sus predicciones.
- **Minimización (RN-06):** el servicio de IA solo recibe indicadores numéricos y no guarda las peticiones.

## Pruebas

```bash
cd backend
pip install -r requirements-dev.txt
pytest -v      # necesita PostgreSQL; usa TEST_DATABASE_URL (por defecto salonflow_test en localhost)

cd ../ia
pytest -v      # usa el modelo entrenado ia/modelo_riesgo.keras
```

- **Backend (56 pruebas):** crean una base limpia desde los scripts SQL y cubren autenticación, permisos por rol, cruces de citas, validaciones, flujo de estados, inventario, comisiones y reportes. También cubren la integración con la IA (simulando el servicio cuando responde, cuando falla y cuando devuelve datos inválidos) y la protección de datos.
- **Servicio de IA (9 pruebas):** estado del servicio, predicción del ejemplo, rechazo de valores fuera de rango, que no se devuelvan datos personales y la clave de acceso.

GitHub Actions ejecuta las dos suites en cada push (`.github/workflows/ci.yml`) y revisa que el script de Supabase esté al día.

## Despliegue

| Parte | Servicio | Configuración |
|---|---|---|
| Base de datos | Supabase | Script `BaseDeDatos/supabase/salonflow_supabase.sql` |
| API + interfaz | Render, servicio `salonflow-api` | Blueprint `render.yaml`. Pegar `DATABASE_URL` e `IA_URL`. |
| Servicio de IA | Render, servicio `salonflow-ia` | Blueprint `render.yaml`. La clave `IA_API_KEY` se genera y se comparte sola. |

TensorFlow usa bastante memoria. Si el plan gratuito de Render (512 MB) no alcanza para `salonflow-ia`, hay que usar el plan *starter*.

## Reglas de negocio

| Código | Regla | Requerimientos |
|--------|-------|----------------|
| RN-01 | Un estilista no puede tener dos citas cuyos intervalos [inicio, fin) se solapen. | RF-05, RF-06 |
| RN-02 | Comisión = precio final del servicio × porcentaje del estilista; el porcentaje por defecto es 30 %. | RF-07, RF-11 |
| RN-03 | Solo una cita en estado «Atendida» genera venta, comisión y descuento de inventario. | RF-07, RF-09, RF-11 |
| RN-04 | Las existencias de un producto nunca pueden ser negativas. | RF-09 |
| RN-05 | Los registros con historial (usuarios, clientes, servicios, productos) se desactivan en lugar de eliminarse. | RF-01, RF-03, RF-04, RF-08 |
| RN-06 | Al servicio de predicción solo se envían indicadores numéricos y un identificador interno; nunca nombres, teléfonos ni correos de clientes. | RF-14 |
| RN-07 | No se registra un cliente sin su autorización previa para el tratamiento de datos; quien la revoca sale del análisis de IA. | RF-03, RF-14 |
