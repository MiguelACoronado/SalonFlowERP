# Política de tratamiento de datos personales · SalonFlow ERP

**Versión 1.0** · Noviembre de 2026
Marco legal: Ley Estatutaria 1581 de 2012 y su reglamentación (Decreto 1074 de 2015).

> Es la política modelo que acompaña al software. Cada salón que use SalonFlow es el **Responsable del Tratamiento**: antes de usarla debe completar sus datos (sección 1) y configurarlos en las variables `RESPONSABLE_NOMBRE` y `RESPONSABLE_CONTACTO` del backend, que aparecen en el aviso de privacidad.

## 1. Responsable del tratamiento

| | |
|---|---|
| Responsable | *Nombre del salón* (en la demo: «SalonFlow (salón de demostración)») |
| Dirección | *Dirección del salón* |
| Canal de atención | *Correo o teléfono* (en la demo: privacidad@salonflow.co) |

Los proveedores de alojamiento (Supabase para la base de datos y Render para la aplicación) actúan como **Encargados del Tratamiento**: guardan y procesan los datos por cuenta del salón, sin usarlos para fines propios.

## 2. Datos que se tratan

| Titular | Datos | ¿Sensibles? |
|---|---|---|
| Clientes del salón | Nombre, teléfono, servicio frecuente, historial de citas (fecha, servicio, estilista, precio) | No |
| Personal (usuarios del sistema) | Nombre, correo, rol, contraseña (guardada solo como hash bcrypt) | No |

SalonFlow **no recolecta datos sensibles** (art. 5): ni salud, ni biometría, ni origen étnico. No se piden fecha de nacimiento ni documento de identidad. Los datos de **menores de edad** (art. 7) solo pueden registrarse con la autorización de su representante legal.

## 3. Finalidades

1. Agendar, confirmar y recordar citas.
2. Llevar el historial de servicios del cliente.
3. Calcular las comisiones del personal y los reportes del negocio.
4. **Analizar la frecuencia de visitas con inteligencia artificial** para sugerir a qué clientes contactar con fines de fidelización (ver sección 4).

Los datos no se venden, no se ceden a terceros y no se usan para publicidad de otras empresas.

## 4. Tratamiento con inteligencia artificial

SalonFlow tiene un servicio de IA propio (carpeta `ia/` del repositorio): una red neuronal que estima la probabilidad de que un cliente deje de venir.

- **Datos mínimos (RN-06):** al modelo solo se le envían cuatro números por cliente: días desde la última visita, intervalo promedio entre visitas, número de visitas y gasto promedio, junto con un identificador interno. **Nunca se envían el nombre, el teléfono ni el correo.**
- **Sin terceros:** el modelo es propio y corre en la infraestructura del salón. No se usan servicios externos de IA.
- **Sin decisiones automáticas:** el resultado es una sugerencia que solo ve el administrador. La decisión de contactar al cliente, y qué ofrecerle, siempre la toma una persona.
- **El servicio no guarda las peticiones.** El backend guarda el resultado (probabilidad y versión del modelo) en la tabla `prediccion_riesgo` para que se pueda revisar después.
- **Solo clientes que autorizaron:** quien no autorizó o revocó la autorización no se envía al modelo, y sus predicciones se borran.
- **No es información crediticia:** la probabilidad de «no volver» es una herramienta interna de fidelización. No es un reporte financiero ni comercial en el sentido de la Ley 1266 de 2008 y no se comparte con centrales de riesgo ni con otras personas.

## 5. Autorización (arts. 9 y 12)

- Antes de registrar a un cliente, el personal le lee el **aviso de privacidad**. El sistema lo entrega en `GET /api/v1/clientes/aviso-privacidad`, e incluye el responsable, los datos, las finalidades, el almacenamiento y los derechos.
- Sin autorización (`autoriza_datos = true`) **la API no registra al cliente** (responde 422).
- **Prueba de la autorización:** cada cliente guarda `fecha_autorizacion` y `version_politica`, es decir, la versión del aviso que aceptó. La base de datos rechaza una autorización sin esos dos datos (restricción `ck_clientes_prueba_autorizacion`).
- **Almacenamiento fuera de Colombia (art. 26):** los servidores de los proveedores de nube pueden estar fuera del país. El aviso lo informa y la autorización lo incluye de forma expresa (art. 26, lit. a).

## 6. Derechos del titular (art. 8) y cómo ejercerlos

El titular puede **conocer, actualizar y rectificar** sus datos, **pedir prueba** de su autorización, **ser informado** del uso que se les ha dado, **revocar** la autorización o pedir la **supresión** de sus datos, **acceder gratis** a ellos y **presentar quejas** ante la Superintendencia de Industria y Comercio, una vez agotado el trámite ante el salón (art. 16).

| Trámite | Plazo máximo (Ley 1581) | Cómo se atiende en SalonFlow |
|---|---|---|
| **Consulta** (art. 14) | 10 días hábiles, prorrogables 5 | El personal busca al cliente (`GET /clientes?q=`) y le muestra sus datos e historial (`GET /clientes/{id}/historial`). |
| **Reclamo**: corrección, actualización o supresión (art. 15) | 15 días hábiles, prorrogables 8 | Corrección: `PATCH /clientes/{id}`. Revocatoria: `PATCH /clientes/{id}` con `autoriza_datos: false`, que saca al cliente del análisis de IA y borra sus predicciones. |

Las solicitudes se reciben por el canal de atención de la sección 1. Si un reclamo llega incompleto, se pide completarlo dentro de los 5 días siguientes.

**Sobre la supresión:** las citas atendidas son ventas y soporte de las comisiones pagadas, así que pueden conservarse mientras exista una obligación legal o contable de hacerlo. Al revocar la autorización, el cliente deja de recibir cualquier tratamiento distinto de ese.

## 7. Medidas de seguridad (art. 4, lit. g; art. 17, lit. d)

Siguen los principios de **confidencialidad, integridad y disponibilidad**, tomados como modelo de la Política General de Seguridad de la Información del DAFP (v2, 2026).

| Principio | Medida implementada |
|---|---|
| Confidencialidad | Inicio de sesión con JWT que vence en 8 horas. Permisos por rol: el estilista no ve clientes y solo el administrador ve la lista de IA. Contraseñas con hash bcrypt. HTTPS en producción. En Supabase, RLS activado sin políticas públicas, así que solo el backend accede a los datos. |
| Integridad | Restricciones en la base de datos: llaves foráneas, unicidad, `CHECK`, sin cruces de citas y prueba de autorización obligatoria. Las validaciones se hacen dos veces, en la API y en la base de datos. |
| Disponibilidad | Si el servicio de IA falla, el resto del sistema sigue funcionando y se muestra la última lista guardada. Hay respaldos automáticos del proveedor de base de datos. |
| Minimización | Al servicio de IA solo se le envían números y un identificador interno. No se recolectan datos sensibles. |

**Incidentes:** si hay acceso no autorizado o pérdida de datos, el salón debe informarlo a la Superintendencia de Industria y Comercio (art. 17, lit. n) y revisar los accesos del personal.

## 8. Vigencia y cambios

Rige desde su publicación. Si cambian las finalidades o el texto del aviso, se sube la versión (`VERSION_POLITICA` en `backend/app/core/privacidad.py`) y a los clientes nuevos se les pide la autorización con el texto nuevo. Cada cliente conserva la versión que aceptó.
