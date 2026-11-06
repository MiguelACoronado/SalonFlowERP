import { CircleCheck, TriangleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { EstadoCita } from '../types'

/* ---------- Avisos ---------- */
type Aviso = { id: number; texto: string; tipo: 'ok' | 'error' }
const AvisoContext = createContext<(texto: string, tipo?: Aviso['tipo']) => void>(() => {})

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const avisar = useCallback((texto: string, tipo: Aviso['tipo'] = 'ok') => {
    const id = Date.now() + Math.random()
    setAvisos((a) => [...a, { id, texto, tipo }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 3800)
  }, [])
  return (
    <AvisoContext.Provider value={avisar}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso aviso-${a.tipo}`}>
            {a.tipo === 'ok' ? <CircleCheck /> : <TriangleAlert />}{a.texto}
          </div>
        ))}
      </div>
    </AvisoContext.Provider>
  )
}
// eslint-disable-next-line react-refresh/only-export-components
export const useAviso = () => useContext(AvisoContext)

/* ---------- Estructura ---------- */
export function Encabezado({ titulo, subtitulo, children }: { titulo: string; subtitulo?: ReactNode; children?: ReactNode }) {
  return (
    <div className="pagina-cab">
      <div>
        <h2>{titulo}</h2>
        {subtitulo && <p className="sub">{subtitulo}</p>}
      </div>
      {children && <div className="acciones">{children}</div>}
    </div>
  )
}

export function Panel({ titulo, sub, accion, children, className = '' }: {
  titulo?: ReactNode; sub?: ReactNode; accion?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <section className={`panel ${className}`}>
      {(titulo || accion) && (
        <div className="panel-cab">
          <div>{titulo && <h3>{titulo}</h3>}{sub && <p className="sub">{sub}</p>}</div>
          {accion}
        </div>
      )}
      {children}
    </section>
  )
}

/** Indicadores en una sola franja dividida. */
export function Franja({ children }: { children: ReactNode }) {
  return <div className="franja">{children}</div>
}
export function Stat({ etiqueta, valor, nota, icono, alerta }: { etiqueta: string; valor: ReactNode; nota?: ReactNode; icono?: ReactNode; alerta?: boolean }) {
  return (
    <div className={`stat ${alerta ? 'stat-alerta' : ''}`}>
      <span className="stat-etiqueta">{icono}{etiqueta}</span>
      <strong className="stat-valor">{valor}</strong>
      {nota && <span className="stat-nota">{nota}</span>}
    </div>
  )
}

export function Avatar({ nombre, grande }: { nombre: string; grande?: boolean }) {
  const ini = nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
  return <span className={`avatar ${grande ? 'grande' : ''}`} aria-hidden>{ini}</span>
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <div className="cargando"><span className="spinner" aria-hidden /> {texto}</div>
}

export function Vacio({ texto, children }: { texto: string; children?: ReactNode }) {
  return <div className="vacio"><p>{texto}</p>{children}</div>
}

export function Alerta({ texto, onReintentar }: { texto: string; onReintentar?: () => void }) {
  return (
    <div className="alerta" role="alert">
      <span>{texto}</span>
      {onReintentar && <button className="btn btn-sec btn-sm" onClick={onReintentar}>Reintentar</button>}
    </div>
  )
}

const CLASE_ESTADO: Record<EstadoCita, 'wait' | 'info' | 'ok' | 'muted'> = {
  Pendiente: 'wait', Confirmada: 'info', Atendida: 'ok', Cancelada: 'muted',
}
export function BadgeEstado({ estado }: { estado: EstadoCita }) {
  return <span className={`badge badge-${CLASE_ESTADO[estado]}`}>{estado}</span>
}
export function Badge({ texto, clase }: { texto: string; clase: 'ok' | 'wait' | 'info' | 'low' | 'muted' }) {
  return <span className={`badge badge-${clase}`}>{texto}</span>
}

/* ---------- Formularios ---------- */
export function Campo({ etiqueta, error, children, ayuda }: { etiqueta: string; error?: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className={`campo ${error ? 'campo-error' : ''}`}>
      <span className="campo-etiqueta">{etiqueta}</span>
      {children}
      {error ? <span className="campo-msg">{error}</span> : ayuda && <span className="campo-ayuda">{ayuda}</span>}
    </label>
  )
}

/** Panel lateral que se desliza desde la derecha (formularios y detalles). */
export function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])
  return (
    <div className="lateral-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="lateral-panel modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="lateral-cab">
          <h3>{titulo}</h3>
          <button className="icono-btn" onClick={onCerrar} aria-label="Cerrar"><X /></button>
        </div>
        <div className="lateral-cuerpo">{children}</div>
      </div>
    </div>
  )
}

/** Barra horizontal para comparar cantidades. */
export function Barra({ etiqueta, valor, max, texto }: { etiqueta: string; valor: number; max: number; texto: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  return (
    <div className="barra">
      <span>{etiqueta}</span>
      <div className="barra-pista"><div className="barra-relleno" style={{ width: `${pct}%` }} /></div>
      <span className="barra-valor">{texto}</span>
    </div>
  )
}
