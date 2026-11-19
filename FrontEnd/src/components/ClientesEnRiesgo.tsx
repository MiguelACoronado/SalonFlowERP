import { Check, Phone, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { api, ApiError } from '../api/client'
import type { ClientesEnRiesgo as Datos } from '../types'
import { fechaCorta } from '../utils/format'
import { Alerta, Cargando, Panel, Vacio, useAviso } from './ui'
import { useApi } from './useApi'

const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`

/** RF-14: clientes con riesgo de no volver, calculados por el servicio de IA. Solo para el administrador. */
export default function ClientesEnRiesgo({ onCambio }: { onCambio?: () => void }) {
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

  const d = lista.datos
  return (
    <section id="riesgo" className="pila">
      <div className="seccion-titulo">
        <h3>Clientes en riesgo</h3>
        {d?.fecha_calculo && <span className="sub">{d.en_riesgo} de {d.evaluados} evaluados · calculado el {fechaCorta(d.fecha_calculo)}</span>}
      </div>
      <Panel
        className="panel-ia"
        accion={<button className="btn btn-sec btn-sm" onClick={recalcular} disabled={recalculando}><RefreshCw aria-hidden />{recalculando ? 'Recalculando…' : 'Recalcular'}</button>}
      >
        {lista.error ? <Alerta texto={lista.error} onReintentar={lista.recargar} /> :
          !d ? <Cargando texto="Consultando a la IA…" /> : (
            <>
              {d.aviso && <div className="riesgo-aviso" role="status">{d.aviso}</div>}
              {d.clientes.length === 0 ? <Vacio texto="Ningún cliente en riesgo por ahora." /> : (
                <ul className="riesgo-lista">
                  {d.clientes.map((c) => {
                    const pct = Math.round(Number(c.probabilidad) * 100)
                    const cada = Math.max(1, Math.round(Number(c.intervalo_promedio)))
                    return (
                      <li key={c.id} className={`riesgo-item ${c.contactado ? 'hecho' : ''}`}>
                        <div className="riesgo-prob" style={{ ['--p' as string]: pct }} aria-hidden><span>{pct}%</span></div>
                        <div className="riesgo-txt">
                          <p className="riesgo-linea"><strong>{c.cliente}</strong>: venía cada {dias(cada)}; lleva {dias(c.dias_desde_ultima)} sin venir. Probabilidad de no volver: <b>{pct} %</b></p>
                          <p className="tel"><Phone size={13} aria-hidden /> {c.telefono}</p>
                        </div>
                        {c.contactado
                          ? <span className="badge badge-ok"><Check size={13} aria-hidden />Contactado</span>
                          : <button className="btn btn-pri btn-sm" disabled={marcando === c.id} onClick={() => marcar(c.id)}>Marcar contactado</button>}
                      </li>
                    )
                  })}
                </ul>
              )}
              <p className="riesgo-pie">Sugerencia generada por IA; la decisión de contactar es del propietario.</p>
            </>
          )}
      </Panel>
    </section>
  )
}
