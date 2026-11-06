import { Ban, Check, CircleCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { Cita, Cliente, EstadoCita, Estilista, Servicio } from '../types'
import { capitalizar, fechaLarga, hora12, hoyISO, pesos } from '../utils/format'
import { BadgeEstado, Campo, Modal, useAviso } from './ui'
import { useApi } from './useApi'

/** Cambia el estado de una cita y avisa el resultado. Devuelve true si se guardó. */
// eslint-disable-next-line react-refresh/only-export-components
export function useCambiarEstado() {
  const avisar = useAviso()
  return async (c: Cita, nuevo: EstadoCita): Promise<boolean> => {
    if (nuevo === 'Cancelada' && !confirm(`¿Cancelar la cita de ${c.cliente} a las ${hora12(c.hora)}?`)) return false
    try {
      await api.patch(`/citas/${c.id}/estado`, { estado: nuevo })
      avisar(`Cita de ${c.cliente} ${nuevo.toLowerCase()}`)
      return true
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'No se pudo actualizar la cita', 'error')
      return false
    }
  }
}

/** Botones de acción según el estado de la cita y el rol. */
export function AccionesCita({ cita, onCambio, compacto }: { cita: Cita; onCambio: () => void; compacto?: boolean }) {
  const { tiene } = useAuth()
  const cambiar = useCambiarEstado()
  const abierta = cita.estado === 'Pendiente' || cita.estado === 'Confirmada'
  const ir = async (e: EstadoCita) => { if (await cambiar(cita, e)) onCambio() }
  const sm = compacto ? 'btn-sm' : ''
  return (
    <>
      {cita.estado === 'Pendiente' && <button className={`btn btn-sec ${sm}`} onClick={() => ir('Confirmada')}><Check aria-hidden />Confirmar</button>}
      {abierta && cita.fecha <= hoyISO() && <button className={`btn btn-ok ${sm}`} onClick={() => ir('Atendida')}><CircleCheck aria-hidden />Marcar atendida</button>}
      {abierta && !tiene('estilista') && <button className={`btn btn-peligro ${sm}`} onClick={() => ir('Cancelada')}><Ban aria-hidden />Cancelar cita</button>}
    </>
  )
}

/** Panel con el detalle de una cita. */
export function DetalleCita({ cita, onCerrar, onCambio }: { cita: Cita; onCerrar: () => void; onCambio: () => void }) {
  return (
    <Modal titulo={cita.cliente} onCerrar={onCerrar}>
      <dl className="detalle-cita">
        <dt>Estado</dt><dd><BadgeEstado estado={cita.estado} /></dd>
        <dt>Fecha</dt><dd>{capitalizar(fechaLarga(cita.fecha))}</dd>
        <dt>Hora</dt><dd>{hora12(cita.hora)}</dd>
        <dt>Servicio</dt><dd>{cita.servicio}</dd>
        <dt>Estilista</dt><dd>{cita.estilista}</dd>
        <dt>Valor</dt><dd className="num">{pesos(cita.precio)}</dd>
      </dl>
      <div className="acciones">
        <AccionesCita cita={cita} onCambio={() => { onCambio(); onCerrar() }} />
      </div>
      {(cita.estado === 'Atendida' || cita.estado === 'Cancelada') && <p className="nota">Esta cita ya está cerrada y no admite cambios.</p>}
    </Modal>
  )
}

/** Formulario para agendar una cita. Se puede abrir con estilista, fecha y hora ya elegidos. */
export function NuevaCita({ inicial, estilistas, onCerrar, onCreada }: {
  inicial: { fecha: string; estilista_id?: number; hora?: string; cliente_id?: number }
  estilistas: Estilista[]; onCerrar: () => void; onCreada: (c: Cita) => void
}) {
  const clientes = useApi(() => api.get<Cliente[]>('/clientes'))
  const servicios = useApi(() => api.get<Servicio[]>('/servicios'))
  const [f, setF] = useState({
    fecha: inicial.fecha < hoyISO() ? hoyISO() : inicial.fecha,
    cliente_id: inicial.cliente_id ? String(inicial.cliente_id) : '', servicio_id: '',
    estilista_id: inicial.estilista_id ? String(inicial.estilista_id) : '', hora: inicial.hora ?? '',
  })
  const [libres, setLibres] = useState<string[] | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k: keyof typeof f, v: string) => {
    setF((x) => ({ ...x, [k]: v }))
    setErrores((e) => ({ ...e, [k]: '' }))  // el error se borra al corregir el campo
  }

  // Al elegir fecha y estilista se consultan las horas libres (regla: sin citas cruzadas)
  useEffect(() => {
    if (!f.fecha || !f.estilista_id) return
    api.get<{ horas_libres: string[] }>('/citas/disponibilidad', { fecha: f.fecha, estilista_id: f.estilista_id })
      .then((d) => setLibres(d.horas_libres))
      .catch(() => setLibres([]))
  }, [f.fecha, f.estilista_id])

  const servicio = servicios.datos?.find((s) => String(s.id) === f.servicio_id)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!f.fecha) errs.fecha = 'Elige una fecha.'
    else if (f.fecha < hoyISO()) errs.fecha = 'No se pueden agendar citas en fechas pasadas.'
    if (!f.cliente_id) errs.cliente_id = 'Elige un cliente.'
    if (!f.servicio_id) errs.servicio_id = 'Elige un servicio.'
    if (!f.estilista_id) errs.estilista_id = 'Elige un estilista.'
    if (!f.hora) errs.hora = 'Elige una hora disponible.'
    setErrores(errs)
    setGeneral('')
    if (Object.keys(errs).length) return
    setEnviando(true)
    try {
      const cita = await api.post<Cita>('/citas', {
        ...f, cliente_id: Number(f.cliente_id), servicio_id: Number(f.servicio_id), estilista_id: Number(f.estilista_id),
      })
      onCreada(cita)
    } catch (err) {
      if (err instanceof ApiError) { setGeneral(err.message); setErrores(err.porCampo()) }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Agendar cita" onCerrar={onCerrar}>
      <form onSubmit={guardar} noValidate className="form">
        {general && <div className="alerta" role="alert">{general}</div>}
        <Campo etiqueta="Cliente" error={errores.cliente_id} ayuda="¿No aparece? Regístralo primero en Clientes.">
          <select value={f.cliente_id} onChange={(e) => set('cliente_id', e.target.value)} autoFocus>
            <option value="">Selecciona…</option>
            {clientes.datos?.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.telefono})</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Servicio" error={errores.servicio_id} ayuda={servicio ? `Valor del servicio: ${pesos(servicio.precio)}` : undefined}>
          <select value={f.servicio_id} onChange={(e) => set('servicio_id', e.target.value)}>
            <option value="">Selecciona…</option>
            {servicios.datos?.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </Campo>
        <div className="fila-2">
          <Campo etiqueta="Fecha" error={errores.fecha}>
            <input type="date" min={hoyISO()} value={f.fecha} onChange={(e) => { set('fecha', e.target.value); set('hora', ''); setLibres(null) }} />
          </Campo>
          <Campo etiqueta="Estilista" error={errores.estilista_id}>
            <select value={f.estilista_id} onChange={(e) => { set('estilista_id', e.target.value); set('hora', ''); setLibres(null) }}>
              <option value="">Selecciona…</option>
              {estilistas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Campo>
        </div>
        <Campo etiqueta="Hora" error={errores.hora}
          ayuda={!f.estilista_id ? 'Primero elige la fecha y el estilista.' : libres?.length === 0 ? 'No quedan horas libres ese día.' : undefined}>
          <select value={f.hora} onChange={(e) => set('hora', e.target.value)} disabled={!libres?.length}>
            <option value="">{libres === null && f.estilista_id ? 'Consultando…' : 'Selecciona…'}</option>
            {libres?.map((h) => <option key={h} value={h}>{hora12(h)}</option>)}
          </select>
        </Campo>
        <div className="pie-form">
          <button type="button" className="btn btn-fantasma" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-pri" disabled={enviando}>{enviando ? 'Agendando…' : 'Agendar cita'}</button>
        </div>
      </form>
    </Modal>
  )
}
