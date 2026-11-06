import { CalendarDays, Receipt, Scissors, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { api, ApiError } from '../api/client'
import RangoFechas from '../components/RangoFechas'
import { Alerta, Barra, Cargando, Encabezado, Franja, Panel, Stat } from '../components/ui'
import { useApi } from '../components/useApi'
import type { OcupacionDia, Resumen, ServicioPopular } from '../types'
import { hoyISO, pesos } from '../utils/format'

export default function Reportes() {
  const [desde, setDesde] = useState(hoyISO(-29))
  const [hasta, setHasta] = useState(hoyISO())
  const datos = useApi(async () => {
    if (desde > hasta) throw new ApiError(422, 'Rango de fechas inválido.')
    const p = { desde, hasta }
    const [resumen, populares, ocupacion] = await Promise.all([
      api.get<Resumen>('/reportes/resumen', p),
      api.get<ServicioPopular[]>('/reportes/servicios-populares', p),
      api.get<OcupacionDia[]>('/reportes/ocupacion', p),
    ])
    return { resumen, populares, ocupacion }
  }, [desde, hasta])

  const d = datos.datos
  const maxPop = Math.max(1, ...(d?.populares.map((p) => p.cantidad) ?? [1]))
  const top = d?.ocupacion.reduce((a, b) => (Number(b.pct) > Number(a.pct) ? b : a), d.ocupacion[0])

  return (
    <>
      <Encabezado titulo="Reportes" subtitulo="Calculados con las citas que se atendieron en el periodo." />
      <div className="herramientas"><RangoFechas desde={desde} hasta={hasta} onCambio={(a, b) => { setDesde(a); setHasta(b) }} /></div>
      {datos.error ? <Alerta texto={datos.error} /> : datos.cargando || !d ? <Cargando /> : (
        <>
          <Franja>
            <Stat icono={<TrendingUp />} etiqueta="Ingresos" valor={pesos(d.resumen.ingresos)} />
            <Stat icono={<Scissors />} etiqueta="Servicios realizados" valor={d.resumen.servicios_realizados} />
            <Stat icono={<Receipt />} etiqueta="Ticket promedio" valor={pesos(d.resumen.ticket_promedio)} />
            <Stat icono={<CalendarDays />} etiqueta="Día más ocupado" valor={top?.dia ?? 'Sin datos'} nota={top ? `${top.pct ?? 0}% de ocupación` : undefined} />
          </Franja>
          <Panel titulo="Servicios más pedidos">
              {d.populares.map((p) => <Barra key={p.servicio} etiqueta={p.servicio} valor={p.cantidad} max={maxPop} texto={String(p.cantidad)} />)}
            </Panel>
          <Panel titulo="Ocupación por día de la semana" sub="Porcentaje de horas de los estilistas con cita">
              <div className="columnas-semana">
                {d.ocupacion.map((o) => (
                  <div key={o.dia} className={`col-dia ${o.dia === top?.dia ? 'top' : ''}`}>
                    <span className="col-pct">{o.pct ?? 0}%</span>
                    <div className="col-barra" style={{ height: `calc((100% - 48px) * ${Math.max(Number(o.pct ?? 0), 2) / 100})` }} />
                    <small>{o.dia.slice(0, 3)}</small>
                  </div>
                ))}
              </div>
            </Panel>
        </>
      )}
    </>
  )
}
