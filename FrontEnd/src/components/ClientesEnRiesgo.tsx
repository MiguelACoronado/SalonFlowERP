import { ArrowRight, Check, Phone, RefreshCw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { ClienteEnRiesgo, ClientesEnRiesgo as Datos } from '../types'
import { fechaCorta } from '../utils/format'
import { Garabato } from './Doodles'
import { Alerta, Cargando, Panel, Vacio, useAviso } from './ui'
import { useApi } from './useApi'

const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`
const pct = (c: ClienteEnRiesgo) => Math.round(Number(c.probabilidad) * 100)

/** Datos y acciones de la lista de clientes en riesgo (RF-14), compartidos por el resumen y la página de IA. */
export function useRiesgo(onCambio?: () => void) {
  const avisar = useAviso()
  const lista = useApi(() => api.get<Datos>('/clientes-en-riesgo'))
  const [recalculando, setRecalculando] = useState(false)
  const [marcando, setMarcando] = useState<number | null>(null)

  async function marcar(id: number) {
    setMarcando(id)
    try {
      await api.patch(`/clientes-en-riesgo/${id}/contactado`, { contactado: true })
      lista.setDatos((d) => d && { ...d, clientes: d.clientes.map((c) => c.id === id ? { ...c, contactado: true, contactado_en: new Date().toISOString() } : c) })
      avisar('Cliente marcado como contactado')
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'No se pudo marcar como contactado.', 'error')
    } finally { setMarcando(null) }
  }

  async function recalcular() {
    setRecalculando(true)
    try {
      lista.setDatos(await api.post<Datos>('/clientes-en-riesgo/recalcular'))
      avisar('Lista recalculada con la IA')
      onCambio?.()
    } catch (e) {
      // 503: el servicio de IA no respondió; se muestra el detalle que envía la API
      avisar(e instanceof ApiError ? e.message : 'No se pudo recalcular.', 'error')
    } finally { setRecalculando(false) }
  }

  return { lista, marcar, marcando, recalcular, recalculando }
}

export function ItemRiesgo({ c, marcando, onMarcar }: { c: ClienteEnRiesgo; marcando: boolean; onMarcar: () => void }) {
  const p = pct(c)
  const cada = Math.max(1, Math.round(Number(c.intervalo_promedio)))
  return (
    <li className={`riesgo-item ${c.contactado ? 'hecho' : ''}`}>
      <div className="riesgo-prob" aria-hidden><span>{p}%</span></div>
      <div className="riesgo-txt">
        <p className="riesgo-linea"><strong>{c.cliente}</strong>: venía cada {dias(cada)}; lleva {dias(c.dias_desde_ultima)} sin venir. Probabilidad de no volver: <b>{p} %</b></p>
        <p className="tel"><Phone size={13} aria-hidden /> {c.telefono}</p>
      </div>
      {c.contactado
        ? <span className="badge badge-ok"><Check size={13} aria-hidden />Contactado</span>
        : <button className="btn btn-pri btn-sm" disabled={marcando} onClick={onMarcar}>Marcar contactado</button>}
    </li>
  )
}

export const BotonRecalcular = ({ onClick, recalculando }: { onClick: () => void; recalculando: boolean }) => (
  <button className="btn btn-sec btn-sm" onClick={onClick} disabled={recalculando}>
    <RefreshCw aria-hidden />{recalculando ? 'Recalculando…' : 'Recalcular'}
  </button>
)

/** Resumen para el Inicio: totales y los tres clientes con más riesgo que faltan por contactar. */
export function ResumenIA() {
  const { lista } = useRiesgo()
  const d = lista.datos
  const pendientes = d ? d.clientes.filter((c) => !c.contactado) : []
  const top = [...pendientes].sort((a, b) => Number(b.probabilidad) - Number(a.probabilidad)).slice(0, 3)

  return (
    <section className="panel resumen-ia">
      <div className="panel-cab">
        <div>
          <h3 className="marcador"><Sparkles className="ia-icono" aria-hidden />Resumen de la IA <Garabato className="garabato-titulo" /></h3>
          {d?.fecha_calculo && <p className="sub">Calculado el {fechaCorta(d.fecha_calculo)}</p>}
        </div>
        <Link className="btn btn-sec btn-sm" to="/ia">Ver todo<ArrowRight aria-hidden /></Link>
      </div>
      {lista.error ? <Alerta texto={lista.error} onReintentar={lista.recargar} /> :
        !d ? <Cargando texto="Consultando a la IA…" /> : (
          <div className="resumen-ia-cuerpo">
            <div className="resumen-ia-cifras">
              <div><strong className="marcador">{d.en_riesgo}</strong><span>en riesgo de no volver</span></div>
              <div><strong className="marcador">{pendientes.length}</strong><span>por contactar</span></div>
              <div><strong className="marcador">{d.evaluados}</strong><span>clientes evaluados</span></div>
            </div>
            {top.length === 0 ? <p className="nota">No hay clientes pendientes por contactar.</p> : (
              <ol className="resumen-ia-top">
                {top.map((c) => (
                  <li key={c.id}>
                    <span className="riesgo-prob">{pct(c)}%</span>
                    <div><strong>{c.cliente}</strong><small>{dias(c.dias_desde_ultima)} sin venir · {c.telefono}</small></div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
    </section>
  )
}

type Filtro = 'pendientes' | 'contactados' | 'todos'

/** Lista completa con filtros (página de IA). Solo para el administrador. */
export default function ClientesEnRiesgo({ r }: { r: ReturnType<typeof useRiesgo> }) {
  const { lista, marcar, marcando, recalcular, recalculando } = r
  const [filtro, setFiltro] = useState<Filtro>('pendientes')
  const d = lista.datos
  const contactados = d?.clientes.filter((c) => c.contactado).length ?? 0
  const visibles = (d?.clientes ?? []).filter((c) => filtro === 'todos' || (filtro === 'contactados') === c.contactado)

  return (
    <Panel
      titulo="Clientes en riesgo"
      sub={d?.fecha_calculo ? `${d.en_riesgo} de ${d.evaluados} evaluados · calculado el ${fechaCorta(d.fecha_calculo)}` : undefined}
      accion={<BotonRecalcular onClick={recalcular} recalculando={recalculando} />}
    >
      {lista.error ? <Alerta texto={lista.error} onReintentar={lista.recargar} /> :
        !d ? <Cargando texto="Consultando a la IA…" /> : (
          <>
            {d.aviso && <div className="riesgo-aviso" role="status">{d.aviso}</div>}
            <div className="chips riesgo-filtros" role="group" aria-label="Filtrar">
              <button className="chip" aria-pressed={filtro === 'pendientes'} onClick={() => setFiltro('pendientes')}>Por contactar <b>{d.clientes.length - contactados}</b></button>
              <button className="chip" aria-pressed={filtro === 'contactados'} onClick={() => setFiltro('contactados')}>Contactados <b>{contactados}</b></button>
              <button className="chip" aria-pressed={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todos <b>{d.clientes.length}</b></button>
            </div>
            {visibles.length === 0
              ? <Vacio texto={d.clientes.length === 0 ? 'Ningún cliente en riesgo por ahora.' : 'No hay clientes en este filtro.'} />
              : (
                <ul className="riesgo-lista">
                  {visibles.map((c) => <ItemRiesgo key={c.id} c={c} marcando={marcando === c.id} onMarcar={() => marcar(c.id)} />)}
                </ul>
              )}
            <p className="riesgo-pie">Sugerencia generada por IA; la decisión de contactar es del propietario.</p>
          </>
        )}
    </Panel>
  )
}
