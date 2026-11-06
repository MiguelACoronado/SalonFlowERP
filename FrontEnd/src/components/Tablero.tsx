import { useEffect, useState } from 'react'
import type { Cita, Estilista } from '../types'
import { hora12, hoyISO, pesos } from '../utils/format'
import { Avatar } from './ui'

const APERTURA = 9
const CIERRE = 19            // la última cita empieza a las 18:00
const HORAS = Array.from({ length: CIERRE - APERTURA }, (_, i) => APERTURA + i)

function posicion(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h - APERTURA + m / 60)
}

/** Agenda visual: una columna por estilista ("silla") y las citas ubicadas por hora. */
export default function Tablero({ citas, estilistas, fecha, onAbrir, onHueco }: {
  citas: Cita[]
  estilistas: Estilista[]
  fecha: string
  onAbrir: (c: Cita) => void
  onHueco?: (estilistaId: number, hora: string) => void
}) {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const esHoy = fecha === hoyISO()
  const posAhora = ahora.getHours() + ahora.getMinutes() / 60 - APERTURA
  const mostrarAhora = esHoy && posAhora >= 0 && posAhora <= CIERRE - APERTURA
  const altoTotal = `calc(var(--hora-alto) * ${HORAS.length})`

  return (
    <div className="tablero">
      <div className="tablero-scroll">
        <div className="tablero-grid" style={{ ['--sillas' as string]: estilistas.length }}>
          <div className="esquina" />
          {estilistas.map((e) => {
            const suyas = citas.filter((c) => c.estilista_id === e.id && c.estado !== 'Cancelada')
            return (
              <div key={e.id} className="silla-cab">
                <Avatar nombre={e.nombre} />
                <div>
                  <strong>{e.nombre}</strong>
                  <small>{suyas.length ? `${suyas.length} ${suyas.length === 1 ? 'cita' : 'citas'} por ${pesos(suyas.reduce((s, c) => s + Number(c.precio), 0))}` : 'Libre todo el día'}</small>
                </div>
              </div>
            )
          })}

          <div className="horas" style={{ height: altoTotal }}>
            {HORAS.map((h, i) => (
              <span key={h} style={{ top: `calc(var(--hora-alto) * ${i} + ${i === 0 ? 6 : 0}px)` }}>{h > 12 ? h - 12 : h} {h >= 12 ? 'p. m.' : 'a. m.'}</span>
            ))}
          </div>

          {estilistas.map((e) => (
            <div key={e.id} className="silla" style={{ height: altoTotal }}>
              {onHueco && HORAS.map((h, i) => {
                const hhmm = `${String(h).padStart(2, '0')}:00`
                const pasada = esHoy && h <= ahora.getHours()
                const ocupada = citas.some((c) => c.estilista_id === e.id && c.estado !== 'Cancelada' && Math.floor(posicion(c.hora)) === i)
                if (pasada || ocupada || fecha < hoyISO()) return null
                return (
                  <button key={h} className="hueco" style={{ top: `calc(var(--hora-alto) * ${i})` }}
                    onClick={() => onHueco(e.id, hhmm)} aria-label={`Agendar con ${e.nombre} a las ${hora12(hhmm)}`}>
                    + Agendar {hora12(hhmm)}
                  </button>
                )
              })}
              {citas.filter((c) => c.estilista_id === e.id).map((c) => (
                <button key={c.id} className={`bloque e-${c.estado}`} onClick={() => onAbrir(c)}
                  style={{ top: `calc(var(--hora-alto) * ${posicion(c.hora)} + 4px)` }}
                  aria-label={`${c.cliente}, ${c.servicio}, ${hora12(c.hora)}, ${c.estado}`}>
                  <span className="b-hora">{hora12(c.hora)}</span>
                  <span className="b-cliente">{c.cliente}</span>
                  <span className="b-servicio">{c.servicio}</span>
                </button>
              ))}
              {mostrarAhora && <div className="ahora" style={{ top: `calc(var(--hora-alto) * ${posAhora})` }} />}
            </div>
          ))}
        </div>
      </div>
      <div className="leyenda">
        <span><i className="punto" style={{ background: 'var(--wait)' }} />Pendiente</span>
        <span><i className="punto" style={{ background: 'var(--info)' }} />Confirmada</span>
        <span><i className="punto" style={{ background: 'var(--ok)' }} />Atendida</span>
        <span><i className="punto" style={{ background: 'var(--texto-3)' }} />Cancelada</span>
        {mostrarAhora && <span><i className="punto" style={{ background: 'var(--rojo)', height: 3 }} />Hora actual</span>}
      </div>
    </div>
  )
}
