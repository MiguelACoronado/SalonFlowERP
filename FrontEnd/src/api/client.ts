import type { ErrorCampo } from '../types'

const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`
const CLAVE_TOKEN = 'salonflow.token'

/** Error devuelto por la API: mensaje general + errores por campo. */
export class ApiError extends Error {
  status: number
  errores: ErrorCampo[]
  constructor(status: number, detalle: string, errores: ErrorCampo[] = []) {
    super(detalle)
    this.status = status
    this.errores = errores
  }
  /** Errores indexados por campo, para mostrarlos junto a cada input. */
  porCampo(): Record<string, string> {
    return Object.fromEntries(this.errores.map((e) => [e.campo, e.mensaje]))
  }
}

export const token = {
  get: () => localStorage.getItem(CLAVE_TOKEN),
  set: (t: string) => localStorage.setItem(CLAVE_TOKEN, t),
  clear: () => localStorage.removeItem(CLAVE_TOKEN),
}

let alExpirar: () => void = () => {}
export const onSesionExpirada = (fn: () => void) => { alExpirar = fn }

type Params = Record<string, string | number | boolean | null | undefined>

async function request<T>(metodo: string, ruta: string, cuerpo?: unknown, params?: Params): Promise<T> {
  const url = new URL(BASE + ruta, window.location.origin)
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  })
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const t = token.get()
  if (t) headers.Authorization = `Bearer ${t}`

  let res: Response
  try {
    res = await fetch(url, { method: metodo, headers, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) })
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Verifica que la API esté encendida.')
  }
  const datos = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && t) alExpirar()
    throw new ApiError(res.status, datos?.detalle ?? `Error ${res.status}`, datos?.errores ?? [])
  }
  return datos as T
}

export const api = {
  get: <T>(ruta: string, params?: Params) => request<T>('GET', ruta, undefined, params),
  post: <T>(ruta: string, cuerpo?: unknown) => request<T>('POST', ruta, cuerpo ?? {}),
  patch: <T>(ruta: string, cuerpo: unknown) => request<T>('PATCH', ruta, cuerpo),
  put: <T>(ruta: string, cuerpo: unknown) => request<T>('PUT', ruta, cuerpo),
}
