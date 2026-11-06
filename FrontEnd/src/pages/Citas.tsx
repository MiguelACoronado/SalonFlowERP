import { ChevronLeft, ChevronRight, Columns3, List, Plus } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AccionesCita, DetalleCita, NuevaCita } from '../components/Citas'
import Tablero from '../components/Tablero'
import { Alerta, BadgeEstado, Cargando, Encabezado, useAviso, Vacio } from '../components/ui'
import { useApi } from '../components/useApi'
import type { Cita, EstadoCita, Estilista } from '../types'
import { capitalizar, fechaLarga, hora12, hoyISO, pesos } from '../utils/format'

const ESTADOS: { e: EstadoCita; color: string }[] = [
  { e: 'Pendiente', color: 'var(--wait)' }, { e: 'Confirmada', color: 'var(--info)' },
  { e: 'Atendida', color: 'var(--ok)' }, { e: 'Cancelada', color: 'var(--texto-3)' },
]

function moverDia(iso: string, dias: number) {
  const [a, m, d] = iso.split('-').map(Number)
  const f = new Date(a, m - 1, d + dias)
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
}

export default function Citas() {
  const { usuario, tiene } = useAuth()
  const avisar = useAviso()
  const [fecha, setFecha] = useState(hoyISO())
  const [vista, setVista] = useState<'tablero' | 'lista'>('tablero')
  const [estado, setEstado] = useState<EstadoCita | ''>('')
  const [abierta, setAbierta] = useState<Cita | null>(null)
  const [nueva, setNueva] = useState<{ fecha: string; estilista_id?: number; hora?: string } | null>(null)
  const estilistas = useApi(() => api.get<Estilista[]>('/estilistas'))
  const citas = useApi(() => api.get<Cita[]>('/citas', { fecha }), [fecha])

  const puedeAgendar = tiene('admin', 'recepcion')
  const todas = citas.datos ?? []
  const visibles = estado ? todas.filter((c) => c.estado === estado) : todas
  const sillas = (estilistas.datos ?? []).filter((e) => !tiene('estilista') || e.id === usuario?.estilista_id)
  const total = todas.filter((c) => c.estado !== 'Cancelada').reduce((s, c) => s + Number(c.precio), 0)

  return (
    <>
      <Encabezado titulo="Agenda" subtitulo={`${capitalizar(fechaLarga(fecha))}${fecha === hoyISO() ? ' (hoy)' : ''}`}>
        {puedeAgendar && <button className="btn btn-pri" onClick={() => setNueva({ fecha })}><Plus aria-hidden />Agendar cita</button>}
      </Encabezado>

      <div className="herramientas">
        <div className="fecha-nav">
          <button onClick={() => setFecha(moverDia(fecha, -1))} aria-label="Día anterior"><ChevronLeft /></button>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value || hoyISO())} aria-label="Fecha" />
          <button onClick={() => setFecha(moverDia(fecha, 1))} aria-label="Día siguiente"><ChevronRight /></button>
          {fecha !== hoyISO() && <button className="hoy-btn" onClick={() => setFecha(hoyISO())}>Hoy</button>}
        </div>
        <div className="chips" role="group" aria-label="Filtrar por estado">
          <button className="chip" aria-pressed={estado === ''} onClick={() => setEstado('')}>Todas <b>{todas.length}</b></button>
          {ESTADOS.map(({ e, color }) => (
            <button key={e} className="chip" aria-pressed={estado === e} onClick={() => setEstado(estado === e ? '' : e)}>
              <i className="punto" style={{ background: color }} />{e} <b>{todas.filter((c) => c.estado === e).length}</b>
            </button>
          ))}
        </div>
        <div className="segmento" style={{ marginLeft: 'auto' }} role="group" aria-label="Vista">
          <button aria-pressed={vista === 'tablero'} onClick={() => setVista('tablero')}><Columns3 aria-hidden />Por estilista</button>
          <button aria-pressed={vista === 'lista'} onClick={() => setVista('lista')}><List aria-hidden />Lista</button>
        </div>
      </div>

      {citas.error ? <Alerta texto={citas.error} onReintentar={citas.recargar} /> : citas.cargando || !estilistas.datos ? <Cargando /> :
        vista === 'tablero' ? (
          <Tablero citas={visibles} estilistas={sillas} fecha={fecha} onAbrir={setAbierta}
            onHueco={puedeAgendar ? (id, hora) => setNueva({ fecha, estilista_id: id, hora }) : undefined} />
        ) : !visibles.length ? (
          <div className="tabla-cont"><Vacio texto={estado ? `No hay citas en estado ${estado.toLowerCase()} este día.` : 'No hay citas este día.'}>
            {puedeAgendar && fecha >= hoyISO() && <button className="btn btn-sec" onClick={() => setNueva({ fecha })}><Plus aria-hidden />Agendar la primera</button>}
          </Vacio></div>
        ) : (
          <div className="tabla-cont">
            <table>
              <thead><tr><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Estilista</th><th className="der">Valor</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {visibles.map((c) => (
                  <tr key={c.id}>
                    <td className="nowrap num">{hora12(c.hora)}</td>
                    <td><button className="enlace-celda" onClick={() => setAbierta(c)}>{c.cliente}</button></td>
                    <td>{c.servicio}</td>
                    <td>{c.estilista}</td>
                    <td className="der num">{pesos(c.precio)}</td>
                    <td><BadgeEstado estado={c.estado} /></td>
                    <td className="acciones-fila"><AccionesCita cita={c} compacto onCambio={citas.recargar} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={4}>Total del día sin canceladas</td><td className="der num">{pesos(total)}</td><td colSpan={2} /></tr></tfoot>
            </table>
          </div>
        )}

      {abierta && <DetalleCita cita={abierta} onCerrar={() => setAbierta(null)} onCambio={citas.recargar} />}
      {nueva && (
        <NuevaCita inicial={nueva} estilistas={estilistas.datos ?? []} onCerrar={() => setNueva(null)}
          onCreada={(c) => { setNueva(null); setFecha(c.fecha); avisar(`Cita agendada para ${c.cliente}`); citas.recargar() }} />
      )}
    </>
  )
}
