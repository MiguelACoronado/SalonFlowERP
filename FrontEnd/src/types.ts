export type Rol = 'admin' | 'recepcion' | 'estilista'
export type EstadoCita = 'Pendiente' | 'Confirmada' | 'Atendida' | 'Cancelada'

export interface Usuario {
  id: number
  nombre: string
  email: string
  rol: Rol
  estilista_id: number | null
  activo: boolean
}

export interface Estilista { id: number; nombre: string; activo: boolean }
export interface Servicio { id: number; nombre: string; precio: string; activo: boolean }
export interface Categoria { id: number; nombre: string }

export interface Cita {
  id: number
  fecha: string
  hora: string
  cliente_id: number
  cliente: string
  servicio_id: number
  servicio: string
  estilista_id: number
  estilista: string
  estado: EstadoCita
  precio: string
}

export interface Cliente {
  id: number
  nombre: string
  telefono: string
  servicio_frecuente_id: number | null
  servicio_frecuente: string | null
  ultima_visita: string | null
  dias_sin_visita: number | null
}

export interface Producto {
  id: number
  nombre: string
  categoria_id: number
  categoria: string
  stock: number
  minimo: number
  estado: 'Stock bajo' | 'Disponible'
}

export interface Movimiento { id: number; producto_id: number; cantidad: number; motivo: string; fecha: string }

export interface FilaComision { estilista: string; servicios: number; total: string; comision: string }
export interface Comisiones { tasa: string; filas: FilaComision[]; totales: FilaComision; desde: string; hasta: string }

export interface Resumen { ingresos: string; servicios_realizados: number; ticket_promedio: string }
export interface ServicioPopular { servicio: string; cantidad: number }
export interface OcupacionDia { num_dia: number; dia: string; pct: string | null }

export interface Tablero {
  fecha: string
  agenda: { activas: number; pendientes: number; confirmadas: number; atendidas: number; canceladas: number; valor_agendado: number }
  ventas_hoy: { servicios: number; ingresos: number }
  clientes_total?: number
  clientes_inactivos?: number
  productos_stock_bajo?: number
  mes?: { ingresos: number; servicios_realizados: number; ticket_promedio: number }
}

export interface ErrorCampo { campo: string; mensaje: string }
