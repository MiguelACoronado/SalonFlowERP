# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personal de peluquerías y barberías de barrio. Tres roles con permisos distintos:

- **Administrador / propietario:** ve todo; reportes, servicios y precios, usuarios, clientes en riesgo.
- **Recepción:** agenda citas, atiende clientes e inventario desde el computador del mostrador.
- **Estilista:** consulta su propia agenda y sus comisiones, a menudo desde el celular entre clientes.

Uso confirmado: mitad computador (recepción y administración), mitad celular (estilistas).

## Product Purpose

Administrar el salón en un solo lugar: agenda por silla sin cruces de horario, clientes con historial, inventario con alertas de stock, comisiones por estilista y reportes. El éxito es que la recepción agenda una cita en segundos y que nadie tenga que llevar cuentas en papel.

## Positioning

Pensado para el salón de barrio, no para cadenas. Incluye un servicio de IA propio (red neuronal TensorFlow) que señala a los clientes en riesgo de no volver, para que el propietario los contacte.

## Operating Context

- La agenda del día, organizada por silla/estilista, es la vista central del trabajo diario.
- La API (FastAPI) entrega también la interfaz compilada de `FrontEnd/dist`.
- La recomendación de la IA es una sugerencia; la decisión de contactar es del propietario.

## Capabilities and Constraints

- React 19 + TypeScript + Vite, react-router, lucide-react. Sin librería de componentes.
- Autenticación JWT; rutas protegidas por rol (`admin`, `recepcion`, `estilista`).
- Moneda en pesos colombianos; interfaz en español (Colombia).
- Tratamiento de datos personales bajo la Ley 1581 (autorización explícita al registrar clientes).
- Proyecto académico: Arquitectura de Software, Universidad Manuela Beltrán.

## Brand Commitments

- Nombre: **SalonFlow** (SalonFlow ERP).
- Paleta obligatoria, la del prototipo original: vino `#7A2333`, vino oscuro `#5C1A26`, crema `#F7F2E9`, papel `#FFFCF7`, carbón `#2A2420`, dorado `#B9922F`, línea `#DCD2BC`.
- Tono: directo, tuteo, español sencillo.

## Evidence on Hand

- Datos de prueba realistas en `BaseDeDatos/02_datos_prueba.sql`.
- No hay testimonios, logos de clientes ni cifras comerciales: no inventarlos.

## Product Principles

1. La agenda de hoy primero: lo que pasa en las sillas ahora mismo manda.
2. Cada rol ve solo lo que necesita.
3. Las reglas se validan con mensajes claros, no con errores técnicos.
4. La IA sugiere, la persona decide.

## Accessibility & Inclusion

Uso en celular con una mano y en mostrador con luz de día: contraste AA, objetivos táctiles cómodos, foco de teclado visible.
