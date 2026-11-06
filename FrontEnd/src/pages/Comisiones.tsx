import { Percent, Receipt, Scissors, Wallet } from 'lucide-react'
import { useState } from 'react'
import { api, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import RangoFechas from '../components/RangoFechas'
import { Alerta, Avatar, Cargando, Encabezado, Franja, Panel, Stat, useAviso, Vacio } from '../components/ui'
import { useApi } from '../components/useApi'
import type { Comisiones as Datos } from '../types'
import { fechaCorta, hoyISO, pesos } from '../utils/format'

const TASAS = [20, 25, 30, 35, 40]

export default function Comisiones() {
  const { tiene } = useAuth()
  const avisar = useAviso()
  const [desde, setDesde] = useState(hoyISO(-29))
  const [hasta, setHasta] = useState(hoyISO())
  const datos = useApi(() => (desde > hasta ? Promise.reject(new ApiError(422, 'Rango de fechas inválido.')) : api.get<Datos>('/comisiones', { desde, hasta })), [desde, hasta])

  async function cambiarTasa(t: number) {
    try {
      await api.put('/comisiones/tasa', { tasa: t })
      avisar(`La comisión ahora es del ${t}%`)
      datos.recargar()
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'No se pudo cambiar la tasa', 'error')
    }
  }

  const d = datos.datos
  const tasa = d ? Number(d.tasa) : 0
  const maxTotal = Math.max(1, ...(d?.filas.map((f) => Number(f.total)) ?? [1]))
  return (
    <>
      <Encabezado titulo="Comisiones" subtitulo="Cada estilista gana un porcentaje del valor de los servicios que atendió.">
        {tiene('admin') && d && (
          <div className="segmento" role="group" aria-label="Porcentaje de comisión">
            {(TASAS.includes(tasa) ? TASAS : [...TASAS, tasa].sort((a, b) => a - b)).map((t) => (
              <button key={t} aria-pressed={t === tasa} onClick={() => t !== tasa && cambiarTasa(t)}>{t}%</button>
            ))}
          </div>
        )}
      </Encabezado>
      <div className="herramientas"><RangoFechas desde={desde} hasta={hasta} onCambio={(a, b) => { setDesde(a); setHasta(b) }} /></div>

      {datos.error ? <Alerta texto={datos.error} /> : datos.cargando || !d ? <Cargando /> : !d.filas.length ? <Vacio texto="No hay estilistas activos." /> : (
        <>
          <Franja>
            <Stat icono={<Wallet />} etiqueta={d.filas.length > 1 ? 'Comisiones a pagar' : 'Tu comisión'} valor={pesos(d.totales.comision)} />
            <Stat icono={<Receipt />} etiqueta="Valor atendido" valor={pesos(d.totales.total)} />
            <Stat icono={<Scissors />} etiqueta="Servicios atendidos" valor={d.totales.servicios} />
            <Stat icono={<Percent />} etiqueta="Porcentaje vigente" valor={`${tasa}%`} />
          </Franja>
          <Panel titulo="Por estilista" sub={`Del ${fechaCorta(d.desde)} al ${fechaCorta(d.hasta)}`}>
            <div className="filas-comision">
              {d.filas.map((f) => (
                <div key={f.estilista} className="fila-comision">
                  <div className="celda-persona"><Avatar nombre={f.estilista} /><div><strong style={{ fontWeight: 600 }}>{f.estilista}</strong><small>{f.servicios} servicios atendidos</small></div></div>
                  <div className="barra-pista" title={pesos(f.total)}><div className="barra-relleno" style={{ width: `${(Number(f.total) / maxTotal) * 100}%` }} /></div>
                  <div className="monto"><strong>{pesos(f.comision)}</strong><small>de {pesos(f.total)} atendidos</small></div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </>
  )
}
