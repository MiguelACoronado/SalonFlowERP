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
  /** Ley 1581: autorización del tratamiento de datos y su prueba (fecha y versión del aviso). */
  autoriza_datos: boolean
  fecha_autorizacion: string | null
  version_politica: string | null
}

/** Aviso de privacidad (Ley 1581, art. 12) que se le lee al cliente antes de registrarlo. */
export interface AvisoPrivacidad {
  version: string
  responsable: string
  contacto: string
  datos: string[]
  finalidades: string[]
  almacenamiento: string
  derechos: string
  texto: string
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
  clientes_en_riesgo?: number | null
  mes?: { ingresos: number; servicios_realizados: number; ticket_promedio: number }
}

export interface ErrorCampo { campo: string; mensaje: string }

export interface ClienteEnRiesgo {
  id: number
  cliente_id: number
  cliente: string
  telefono: string
  dias_desde_ultima: number
  intervalo_promedio: string
  num_visitas: number
  gasto_promedio: string
  probabilidad: string
  contactado: boolean
  contactado_en: string | null
}
export interface ClientesEnRiesgo {
  fecha_calculo: string | null
  actualizada: boolean
  version_modelo: string | null
  evaluados: number
  en_riesgo: number
  aviso: string | null
  clientes: ClienteEnRiesgo[]
}

export interface ProbabilidadesIA {
  fecha_calculo: string | null
  version_modelo: string | null
  clientes: { cliente_id: number; probabilidad: string; en_riesgo: boolean }[]
}
