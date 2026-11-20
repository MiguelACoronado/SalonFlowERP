---
version: 1
slug: "frontend-src"
primary_target: "FrontEnd/src"
related_targets: []
---

## Scope

App completa de SalonFlow ERP (FrontEnd/src): layout, login, inicio, agenda, clientes, inventario, comisiones, reportes, servicios, usuarios. Modo: Operate. Construcción code-led (sin generación de imágenes).

## Audience and job

Recepción y administración en PC; estilistas en celular. Agendar, consultar la agenda por silla, registrar ventas y stock, revisar comisiones.

## Constraints

Paleta del prototipo fijada por el usuario. Navegación: barra lateral vino fija en escritorio, cajón en celular. Tipografía nueva a criterio. Conservar rutas, permisos, copy y comportamiento.

## Direction contract

THESIS: El libro del salón: la app se lee como un libro de cuentas encuadernado en vino, con reglas finas y cifras alineadas, no como un tablero de tarjetas flotantes. Rechaza los pasteles, el vidrio y las tarjetas de métricas con degradado.

OWN-WORLD: Lomo vino `#7A2333` fijo a la izquierda con filete dorado; página de papel `#FFFCF7` sobre crema `#F7F2E9`; tinta carbón `#2A2420`; reglas `#DCD2BC` y reglas gruesas carbón bajo los encabezados. Dorado solo como señal (activo, foco, hora actual). Schibsted Grotesk en todo, cifras tabulares. Radios de 6–10 px, sin sombras salvo en capas flotantes.

STORY: Al entrar, la persona ve su saludo, una franja de cifras del día separadas por reglas verticales y la agenda por silla; entiende qué pasa hoy y agenda con un clic en el hueco libre.

FIRST VIEWPORT: Escritorio: lomo vino 248 px con marca, navegación y usuario abajo; a la derecha el encabezado con regla carbón de 2 px y el botón vino «Agendar cita» arriba a la derecha; debajo la franja de cifras y el inicio del tablero de sillas. Celular: barra superior papel con marca y botón de menú; el cajón vino se desliza desde la izquierda.

FORM: Libro de cuentas / ledger editorial-operativo, opción 1 de 1. seed: none (pinned) — «basate en index.html para tener la paleta de colores anterior», «Barra lateral vino fija».

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
