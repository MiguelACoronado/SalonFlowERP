const pesosFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

export const pesos = (v: number | string) => pesosFmt.format(Number(v))

export function hora12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const sufijo = h >= 12 ? 'p. m.' : 'a. m.'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${sufijo}`
}

export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function fechaCorta(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  const mismoAnio = a === new Date().getFullYear()
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', ...(mismoAnio ? {} : { year: 'numeric' }) })
}

/** Primera letra en mayúscula ("jueves, 5 de noviembre" → "Jueves, 5 de noviembre"). */
export const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Fecha local (Colombia) en formato AAAA-MM-DD. */
export function hoyISO(desfaseDias = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + desfaseDias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const ROLES: Record<string, string> = { admin: 'Administrador', recepcion: 'Recepción', estilista: 'Estilista' }
