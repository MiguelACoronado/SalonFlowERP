import { CalendarDays, CircleCheck, Clock, Plus, TrendingUp, TriangleAlert, UserRoundX } from 'lucide-react'
import { Chispas, Corona, Estrella, Flecha, Mancha, Rayo, Subrayado } from '../components/Doodles'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { NuevaCita } from '../components/Citas'
import { ResumenIA } from '../components/ClientesEnRiesgo'
import { Alerta, Cargando, Franja, Stat, useAviso } from '../components/ui'
import { useApi } from '../components/useApi'
import type { Estilista, Tablero as Datos } from '../types'
import { hoyISO, pesos } from '../utils/format'

function saludo() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

export default function Inicio() {
  const { usuario, tiene } = useAuth()
  const avisar = useAviso()
  const tablero = useApi(() => api.get<Datos>('/dashboard'))
  const estilistas = useApi(() => api.get<Estilista[]>('/estilistas'))
  const [nueva, setNueva] = useState<{ fecha: string; estilista_id?: number; hora?: string } | null>(null)

  if (tablero.error) return <Alerta texto={tablero.error} onReintentar={tablero.recargar} />
  if (!tablero.datos) return <Cargando />
  const t = tablero.datos
  const puedeAgendar = tiene('admin', 'recepcion')

  const resumenDia = t.agenda.activas === 0
    ? 'Hoy no hay citas agendadas.'
    : `Hoy ${tiene('estilista') ? 'tienes' : 'hay'} ${t.agenda.activas} ${t.agenda.activas === 1 ? 'cita' : 'citas'}${t.agenda.pendientes ? ` y ${t.agenda.pendientes} sin confirmar` : ''}.`

  return (
    <>
      <section className="hero">
        <Mancha className="mancha mancha-a" color="#B9922F" variante={0} />
        <Mancha className="mancha mancha-b" color="#4A141E" variante={2} />
        <div className="hero-texto">
          <p className="saludo marcador">{saludo()}, {usuario?.nombre.split(' ')[0]} <Flecha className="flecha-saludo" /></p>
          <span className="hero-label">{tiene('estilista') ? 'Tus citas de hoy' : 'Citas de hoy'}</span>
          <h1 className="titulo-gigante marcador">
            {t.agenda.activas} {t.agenda.activas === 1 ? 'cita' : 'citas'}
            <Subrayado className="subrayado" />
            <Corona className="doodle corona" />
          </h1>
          <p className="tagline">{resumenDia}</p>
          <div className="hero-botones">
            {puedeAgendar && <button className="btn btn-oro" onClick={() => setNueva({ fecha: hoyISO() })}><Plus aria-hidden />Agendar cita</button>}
            <Link className="btn btn-borde-claro" to="/citas">Ver la agenda ↗</Link>
          </div>
        </div>
        <div className="burbuja burbuja-hero marcador">¡Sin cruces de horario!</div>
        <Estrella className="doodle estrella-1" />
        <Rayo className="doodle rayo-1" />
        <Chispas className="doodle chispas-1" />
      </section>

      <div className={tiene('admin') ? 'inicio-grid' : undefined}>
        <Franja>
          <Stat icono={<CalendarDays />} etiqueta="Citas de hoy" valor={t.agenda.activas} nota={`${t.agenda.confirmadas} confirmadas, ${t.agenda.pendientes} pendientes`} />
          <Stat icono={<CircleCheck />} etiqueta="Cobrado hoy" valor={pesos(t.ventas_hoy.ingresos)} nota={`${t.ventas_hoy.servicios} ${t.ventas_hoy.servicios === 1 ? 'servicio atendido' : 'servicios atendidos'}`} />
          <Stat icono={<Clock />} etiqueta="Por cobrar hoy" valor={pesos(t.agenda.valor_agendado - t.ventas_hoy.ingresos)} nota="Citas activas sin atender" />
          {t.mes && <Stat icono={<TrendingUp />} etiqueta="Últimos 30 días" valor={pesos(t.mes.ingresos)} nota={`${t.mes.servicios_realizados} servicios, ticket de ${pesos(t.mes.ticket_promedio)}`} />}
          {t.productos_stock_bajo !== undefined && (
            <Stat icono={<TriangleAlert />} etiqueta="Por reponer" valor={t.productos_stock_bajo} alerta={t.productos_stock_bajo > 0}
              nota={t.productos_stock_bajo ? <Link className="enlace" to="/inventario">Ver inventario</Link> : 'Inventario al día'} />
          )}
          {tiene('admin') && t.clientes_en_riesgo != null && (
            <Stat icono={<UserRoundX />} etiqueta="Clientes en riesgo" valor={t.clientes_en_riesgo} alerta={t.clientes_en_riesgo > 0}
              nota={<Link className="enlace" to="/ia">Ver en IA</Link>} />
          )}
        </Franja>

        {tiene('admin') && <ResumenIA />}
      </div>

      {nueva && (
        <NuevaCita inicial={nueva} estilistas={estilistas.datos ?? []} onCerrar={() => setNueva(null)}
          onCreada={(c) => { setNueva(null); avisar(`Cita agendada para ${c.cliente}`); tablero.recargar() }} />
      )}
    </>
  )
}
