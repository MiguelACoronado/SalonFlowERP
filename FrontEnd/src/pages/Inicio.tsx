import { CalendarDays, CircleCheck, Clock, Plus, TrendingUp, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { DetalleCita, NuevaCita } from '../components/Citas'
import Tablero from '../components/Tablero'
import { Alerta, Cargando, Encabezado, Franja, Stat, useAviso } from '../components/ui'
import { useApi } from '../components/useApi'
import type { Cita, Estilista, Tablero as Datos } from '../types'
import { hoyISO, pesos } from '../utils/format'

function saludo() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

export default function Inicio() {
  const { usuario, tiene } = useAuth()
  const avisar = useAviso()
  const tablero = useApi(() => api.get<Datos>('/dashboard'))
  const agenda = useApi(() => api.get<Cita[]>('/citas'))
  const estilistas = useApi(() => api.get<Estilista[]>('/estilistas'))
  const [abierta, setAbierta] = useState<Cita | null>(null)
  const [nueva, setNueva] = useState<{ fecha: string; estilista_id?: number; hora?: string } | null>(null)

  if (tablero.error) return <Alerta texto={tablero.error} onReintentar={tablero.recargar} />
  if (!tablero.datos) return <Cargando />
  const t = tablero.datos
  const puedeAgendar = tiene('admin', 'recepcion')
  const sillas = (estilistas.datos ?? []).filter((e) => !tiene('estilista') || e.id === usuario?.estilista_id)
  const recargarTodo = () => { agenda.recargar(); tablero.recargar() }

  const resumenDia = t.agenda.activas === 0
    ? 'Hoy no hay citas agendadas.'
    : `Hoy ${tiene('estilista') ? 'tienes' : 'hay'} ${t.agenda.activas} ${t.agenda.activas === 1 ? 'cita' : 'citas'}${t.agenda.pendientes ? ` y ${t.agenda.pendientes} sin confirmar` : ''}.`

  return (
    <>
      <Encabezado titulo={`${saludo()}, ${usuario?.nombre.split(' ')[0]}`} subtitulo={resumenDia}>
        {puedeAgendar && <button className="btn btn-pri" onClick={() => setNueva({ fecha: hoyISO() })}><Plus aria-hidden />Agendar cita</button>}
      </Encabezado>

      <Franja>
        <Stat icono={<CalendarDays />} etiqueta="Citas de hoy" valor={t.agenda.activas} nota={`${t.agenda.confirmadas} confirmadas, ${t.agenda.pendientes} pendientes`} />
        <Stat icono={<CircleCheck />} etiqueta="Cobrado hoy" valor={pesos(t.ventas_hoy.ingresos)} nota={`${t.ventas_hoy.servicios} ${t.ventas_hoy.servicios === 1 ? 'servicio atendido' : 'servicios atendidos'}`} />
        <Stat icono={<Clock />} etiqueta="Por cobrar hoy" valor={pesos(t.agenda.valor_agendado - t.ventas_hoy.ingresos)} nota="Citas activas sin atender" />
        {t.mes && <Stat icono={<TrendingUp />} etiqueta="Últimos 30 días" valor={pesos(t.mes.ingresos)} nota={`${t.mes.servicios_realizados} servicios, ticket de ${pesos(t.mes.ticket_promedio)}`} />}
        {t.productos_stock_bajo !== undefined && (
          <Stat icono={<TriangleAlert />} etiqueta="Por reponer" valor={t.productos_stock_bajo} alerta={t.productos_stock_bajo > 0}
            nota={t.productos_stock_bajo ? <Link className="enlace" to="/inventario">Ver inventario</Link> : 'Inventario al día'} />
        )}
      </Franja>

      <div className="seccion-titulo">
        <h3>{tiene('estilista') ? 'Tu agenda de hoy' : 'Agenda de hoy'}</h3>
        <Link className="enlace" to="/citas">Abrir agenda completa</Link>
      </div>
      {agenda.error ? <Alerta texto={agenda.error} onReintentar={agenda.recargar} /> :
        !agenda.datos || !estilistas.datos ? <Cargando /> :
          <Tablero citas={agenda.datos} estilistas={sillas} fecha={hoyISO()} onAbrir={setAbierta}
            onHueco={puedeAgendar ? (id, hora) => setNueva({ fecha: hoyISO(), estilista_id: id, hora }) : undefined} />}

      {abierta && <DetalleCita cita={abierta} onCerrar={() => setAbierta(null)} onCambio={recargarTodo} />}
      {nueva && (
        <NuevaCita inicial={nueva} estilistas={estilistas.datos ?? []} onCerrar={() => setNueva(null)}
          onCreada={(c) => { setNueva(null); avisar(`Cita agendada para ${c.cliente}`); recargarTodo() }} />
      )}
    </>
  )
}
