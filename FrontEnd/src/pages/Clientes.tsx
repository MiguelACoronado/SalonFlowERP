import { ArrowDown, ArrowUp, CalendarDays, Pencil, Phone, Plus, Search, Sparkles, UserRound, X } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { api, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { NuevaCita } from '../components/Citas'
import { Alerta, Avatar, Badge, BadgeEstado, Campo, Cargando, Encabezado, Modal, useAviso, Vacio } from '../components/ui'
import { useApi } from '../components/useApi'
import type { AvisoPrivacidad, Cita, Cliente, Estilista, ProbabilidadesIA, Servicio } from '../types'
import { fechaCorta, hora12, hoyISO, pesos } from '../utils/format'

type Filtro = 'todos' | 'inactivos' | 'nuevos' | 'riesgo'
type Orden = 'nombre' | 'visita' | 'riesgo'
type Prediccion = { pct: number; enRiesgo: boolean }

/** En pantallas anchas la ficha va al lado de la lista; en las demás, en una ventana. */
function usePantallaAncha(px = 1200) {
  const consulta = `(min-width: ${px}px)`
  const [ancha, setAncha] = useState(() => window.matchMedia(consulta).matches)
  useEffect(() => {
    const m = window.matchMedia(consulta)
    const cambio = () => setAncha(m.matches)
    m.addEventListener('change', cambio)
    return () => m.removeEventListener('change', cambio)
  }, [consulta])
  return ancha
}

/** Porcentaje de la IA (probabilidad de no volver) con una barra corta para comparar de un vistazo. */
function RiesgoIA({ p, cliente }: { p?: Prediccion; cliente: Cliente }) {
  if (!p) return <small title={cliente.autoriza_datos ? 'La IA evalúa clientes con dos visitas o más' : 'Sin autorización de datos'}>Sin datos</small>
  return (
    <span className={`ia-medida ${p.enRiesgo ? 'alto' : ''}`} title="Probabilidad de no volver según la IA">
      <span className="ia-pista"><i style={{ width: `${p.pct}%` }} /></span>
      <b>{p.pct} %</b>
    </span>
  )
}

export default function Clientes() {
  const avisar = useAviso()
  const ancha = usePantallaAncha()
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [orden, setOrden] = useState<{ campo: Orden; asc: boolean }>({ campo: 'nombre', asc: true })
  const [seleccion, setSeleccion] = useState<number | null>(null)
  const [editando, setEditando] = useState<Cliente | 'nuevo' | null>(null)
  const [agendar, setAgendar] = useState<Cliente | null>(null)
  const estilistas = useApi(() => api.get<Estilista[]>('/estilistas'))
  const { tiene } = useAuth()
  const esAdmin = tiene('admin')
  // Solo el administrador ve la IA (RF-14). No llama al servicio: usa el último cálculo guardado.
  const ia = useApi<ProbabilidadesIA | null>(() => esAdmin ? api.get<ProbabilidadesIA>('/clientes-en-riesgo/probabilidades') : Promise.resolve(null), [esAdmin])
  const prediccion = new Map((ia.datos?.clientes ?? []).map((c) => [c.cliente_id, { pct: Math.round(Number(c.probabilidad) * 100), enRiesgo: c.en_riesgo }]))

  // Espera 300 ms después de escribir para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto.trim()), 300)
    return () => clearTimeout(t)
  }, [texto])

  const clientes = useApi(() => api.get<Cliente[]>('/clientes', { q: busqueda }), [busqueda])
  const todos = clientes.datos ?? []
  const inactivos = todos.filter((c) => (c.dias_sin_visita ?? 0) > 30)
  const nuevos = todos.filter((c) => !c.ultima_visita)
  const enRiesgo = todos.filter((c) => prediccion.get(c.id)?.enRiesgo)
  const filtrados = filtro === 'inactivos' ? inactivos : filtro === 'nuevos' ? nuevos : filtro === 'riesgo' ? enRiesgo : todos
  const valor = (c: Cliente): number | string => orden.campo === 'nombre' ? c.nombre
    : orden.campo === 'visita' ? (c.ultima_visita ?? '')
    : (prediccion.get(c.id)?.pct ?? -1)
  const lista = [...filtrados].sort((a, b) => {
    const x = valor(a), y = valor(b)
    const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es')
    return orden.asc ? r : -r
  })
  const elegido = todos.find((c) => c.id === seleccion) ?? null
  const predElegido = elegido && esAdmin && ia.datos ? prediccion.get(elegido.id) ?? null : undefined

  // Riesgo y última visita se leen mejor de mayor a menor; el nombre, de la A a la Z.
  const ordenarPor = (campo: Orden) => setOrden((o) => o.campo === campo ? { campo, asc: !o.asc } : { campo, asc: campo === 'nombre' })
  const Cabecera = ({ campo, children, clase = '' }: { campo: Orden; children: ReactNode; clase?: string }) => (
    <th className={clase} aria-sort={orden.campo === campo ? (orden.asc ? 'ascending' : 'descending') : 'none'}>
      <button className="th-orden" onClick={() => ordenarPor(campo)}>
        {children}{orden.campo === campo && (orden.asc ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />)}
      </button>
    </th>
  )

  const ficha = elegido && (
    <Ficha cliente={elegido} prediccion={predElegido}
      onEditar={() => { setEditando(elegido); if (!ancha) setSeleccion(null) }}
      onAgendar={() => { setAgendar(elegido); if (!ancha) setSeleccion(null) }} />
  )

  return (
    <>
      <Encabezado titulo="Clientes" subtitulo={clientes.datos ? `${todos.length} clientes registrados. ${inactivos.length} llevan más de un mes sin venir.` : undefined}>
        <button className="btn btn-pri" onClick={() => setEditando('nuevo')}><Plus aria-hidden />Registrar cliente</button>
      </Encabezado>

      <div className="herramientas">
        <div className="buscador crece">
          <Search aria-hidden />
          <input type="search" placeholder="Buscar por nombre o teléfono" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={60} aria-label="Buscar cliente" />
        </div>
        <div className="chips" role="group" aria-label="Filtrar clientes">
          <button className="chip" aria-pressed={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todos <b>{todos.length}</b></button>
          <button className="chip" aria-pressed={filtro === 'inactivos'} onClick={() => setFiltro('inactivos')}>+30 días sin venir <b>{inactivos.length}</b></button>
          <button className="chip" aria-pressed={filtro === 'nuevos'} onClick={() => setFiltro('nuevos')}>Sin visitas <b>{nuevos.length}</b></button>
          {esAdmin && ia.datos && <button className="chip" aria-pressed={filtro === 'riesgo'} onClick={() => setFiltro('riesgo')}><Sparkles size={14} aria-hidden />En riesgo <b>{enRiesgo.length}</b></button>}
        </div>
      </div>

      <div className={ancha ? 'clientes-split' : undefined}>
        <div className="tabla-cont tabla-compacta">
          {clientes.error ? <Alerta texto={clientes.error} onReintentar={clientes.recargar} /> : clientes.cargando ? <Cargando /> :
            !lista.length ? <Vacio texto={busqueda ? `Ningún cliente coincide con "${busqueda}".` : 'No hay clientes en este grupo.'} /> : (
              <table>
                <thead><tr>
                  <Cabecera campo="nombre">Cliente</Cabecera>
                  <th className="col-servicio">Servicio frecuente</th>
                  <Cabecera campo="visita">Última visita</Cabecera>
                  {esAdmin && <Cabecera campo="riesgo" clase="col-ia">Riesgo IA</Cabecera>}
                </tr></thead>
                <tbody>
                  {lista.map((c) => (
                    <tr key={c.id} className={`fila-click ${c.id === seleccion ? 'fila-activa' : ''}`} onClick={() => setSeleccion(c.id)}>
                      <td>
                        <div className="celda-persona">
                          <Avatar nombre={c.nombre} />
                          <div>
                            <button className="enlace-celda" onClick={(e) => { e.stopPropagation(); setSeleccion(c.id) }} aria-pressed={c.id === seleccion}>{c.nombre}</button>
                            <small>{c.telefono}{!c.autoriza_datos && ' · sin autorización'}</small>
                          </div>
                        </div>
                      </td>
                      <td className="col-servicio">{c.servicio_frecuente ?? <small>Sin definir</small>}</td>
                      <td className="nowrap">
                        {c.ultima_visita ? <>{fechaCorta(c.ultima_visita)} {(c.dias_sin_visita ?? 0) > 30 && <Badge texto={`${c.dias_sin_visita} d`} clase="wait" />}</> : <Badge texto="Nuevo" clase="info" />}
                      </td>
                      {esAdmin && <td className="col-ia">{ia.datos ? <RiesgoIA p={prediccion.get(c.id)} cliente={c} /> : <small>…</small>}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        {ancha && (
          <aside className="ficha-lado" aria-label="Ficha del cliente">
            {ficha ? (
              <>
                <button className="icono-btn ficha-cerrar" onClick={() => setSeleccion(null)} aria-label="Cerrar ficha"><X /></button>
                {ficha}
              </>
            ) : (
              <div className="ficha-vacia">
                <UserRound aria-hidden />
                <p>Elige un cliente de la lista para ver su ficha, su historial{esAdmin ? ' y su riesgo según la IA' : ''}.</p>
              </div>
            )}
          </aside>
        )}
      </div>

      {!ancha && elegido && (
        <Modal titulo="Ficha del cliente" onCerrar={() => setSeleccion(null)}>{ficha}</Modal>
      )}
      {editando && (
        <FormCliente cliente={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)}
          onGuardado={(c, nuevo) => { setEditando(null); setSeleccion(c.id); avisar(nuevo ? `${c.nombre} quedó registrado` : 'Cambios guardados'); clientes.recargar() }} />
      )}
      {agendar && (
        <NuevaCita inicial={{ fecha: hoyISO(), cliente_id: agendar.id }} estilistas={estilistas.datos ?? []} onCerrar={() => setAgendar(null)}
          onCreada={(c) => { setAgendar(null); avisar(`Cita agendada para ${c.cliente}`) }} />
      )}
    </>
  )
}

function Ficha({ cliente, prediccion, onEditar, onAgendar }: { cliente: Cliente; prediccion?: Prediccion | null; onEditar: () => void; onAgendar: () => void }) {
  const h = useApi(() => api.get<Cita[]>(`/clientes/${cliente.id}/historial`), [cliente.id])
  const atendidas = h.datos?.filter((c) => c.estado === 'Atendida') ?? []
  const gastado = atendidas.reduce((s, c) => s + Number(c.precio), 0)
  return (
    <>
      <div className="ficha-cab">
        <Avatar nombre={cliente.nombre} grande />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>{cliente.nombre}</h3>
          <small style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Phone size={14} aria-hidden />{cliente.telefono}</small>
        </div>
      </div>
      <div className="acciones" style={{ marginBottom: 16 }}>
        <button className="btn btn-pri btn-sm" onClick={onAgendar}><CalendarDays aria-hidden />Agendar cita</button>
        <button className="btn btn-sec btn-sm" onClick={onEditar}><Pencil aria-hidden />Editar datos</button>
      </div>
      <div className="ficha-datos">
        <div><span>Visitas</span><strong>{h.datos ? atendidas.length : '…'}</strong></div>
        <div><span>Total gastado</span><strong>{h.datos ? pesos(gastado) : '…'}</strong></div>
        <div><span>Última visita</span><strong>{cliente.ultima_visita ? fechaCorta(cliente.ultima_visita) : 'Nunca'}</strong></div>
        <div><span>Servicio frecuente</span><strong>{cliente.servicio_frecuente ?? 'Sin definir'}</strong></div>
      </div>
      {prediccion !== undefined && (
        <div className={`ficha-ia ${prediccion?.enRiesgo ? 'en-riesgo' : ''}`}>
          <Sparkles aria-hidden />
          {prediccion
            ? <span>Según la IA, la probabilidad de que no vuelva es <strong className="marcador">{prediccion.pct} %</strong>{prediccion.enRiesgo ? ' · en riesgo' : ''}</span>
            : <span>La IA aún no evalúa a este cliente{cliente.autoriza_datos ? ': necesita al menos dos visitas.' : '.'}</span>}
        </div>
      )}
      {!cliente.autoriza_datos && (
        <div className="riesgo-aviso" role="status">Sin autorización de datos: no entra en el análisis de IA. Para registrarla, usa «Editar datos».</div>
      )}
      <h4>Historial de servicios</h4>
      {h.cargando ? <Cargando /> : h.error ? <Alerta texto={h.error} /> : !h.datos?.length ? <Vacio texto="Aún no tiene citas." /> : (
        <div className="ficha-historial">
          <ul className="linea-tiempo">
            {h.datos.map((c) => (
              <li key={c.id} className={`e-${c.estado}`}>
                <div className="lt-cab"><strong>{c.servicio}</strong><span className="num">{pesos(c.precio)}</span></div>
                <small>{fechaCorta(c.fecha)}, {hora12(c.hora)} con {c.estilista}</small>{' '}
                {c.estado !== 'Atendida' && <BadgeEstado estado={c.estado} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

function FormCliente({ cliente, onCerrar, onGuardado }: {
  cliente: Cliente | null; onCerrar: () => void; onGuardado: (c: Cliente, nuevo: boolean) => void
}) {
  const servicios = useApi(() => api.get<Servicio[]>('/servicios'))
  const aviso = useApi(() => api.get<AvisoPrivacidad>('/clientes/aviso-privacidad'))
  const [f, setF] = useState({
    nombre: cliente?.nombre ?? '', telefono: cliente?.telefono ?? '',
    servicio_frecuente_id: cliente?.servicio_frecuente_id ? String(cliente.servicio_frecuente_id) : '',
  })
  // Nuevo: debe autorizar (art. 9). Existente: se muestra su estado y puede revocar o volver a autorizar.
  const [autoriza, setAutoriza] = useState(cliente?.autoriza_datos ?? false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setErrores((e) => ({ ...e, [k]: '' })) }
  const revoca = !!cliente?.autoriza_datos && !autoriza

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (f.nombre.trim().length < 3) errs.nombre = 'Escribe el nombre completo (mínimo 3 letras).'
    else if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(f.nombre.trim())) errs.nombre = 'El nombre solo puede tener letras.'
    const digitos = f.telefono.replace(/\D/g, '')
    if (![7, 10].includes(digitos.length)) errs.telefono = 'El teléfono debe tener 10 dígitos (celular) o 7 (fijo).'
    if (!cliente && !autoriza) errs.autoriza_datos = 'Sin la autorización del cliente no se pueden registrar sus datos (Ley 1581 de 2012).'
    setErrores(errs)
    setGeneral('')
    if (Object.keys(errs).length) return
    if (revoca && !window.confirm(`${cliente!.nombre} dejará de aparecer en el análisis de IA y se borrarán sus predicciones. ¿Registrar la revocatoria?`)) return
    setEnviando(true)
    const cuerpo = {
      ...f, servicio_frecuente_id: f.servicio_frecuente_id ? Number(f.servicio_frecuente_id) : null,
      // Al editar solo se envía si cambió, para no reescribir la fecha de la autorización.
      ...(!cliente || autoriza !== cliente.autoriza_datos ? { autoriza_datos: autoriza } : {}),
    }
    try {
      const c = cliente ? await api.patch<Cliente>(`/clientes/${cliente.id}`, cuerpo) : await api.post<Cliente>('/clientes', cuerpo)
      onGuardado(c, !cliente)
    } catch (err) {
      if (err instanceof ApiError) { setGeneral(err.message); setErrores(err.porCampo()) }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={cliente ? 'Editar cliente' : 'Registrar cliente'} onCerrar={onCerrar}>
      <form className="form" onSubmit={guardar} noValidate>
        {general && <div className="alerta" role="alert">{general}</div>}
        <Campo etiqueta="Nombre completo" error={errores.nombre}>
          <input value={f.nombre} maxLength={120} onChange={(e) => set('nombre', e.target.value)} autoFocus />
        </Campo>
        <Campo etiqueta="Teléfono" error={errores.telefono} ayuda="Celular de 10 dígitos, por ejemplo 300 123 4567">
          <input inputMode="tel" value={f.telefono} maxLength={20} onChange={(e) => set('telefono', e.target.value)} />
        </Campo>
        <Campo etiqueta="Servicio frecuente (opcional)" error={errores.servicio_frecuente_id}>
          <select value={f.servicio_frecuente_id} onChange={(e) => set('servicio_frecuente_id', e.target.value)}>
            <option value="">Sin definir</option>
            {servicios.datos?.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </Campo>

        <fieldset className={`privacidad ${errores.autoriza_datos ? 'campo-error' : ''}`}>
          <legend>Autorización de datos personales</legend>
          {aviso.error ? <Alerta texto={aviso.error} onReintentar={aviso.recargar} /> : !aviso.datos ? <Cargando texto="Cargando el aviso de privacidad…" /> : (
            <>
              {!cliente && <p className="privacidad-instr">Léele este aviso al cliente y marca la casilla solo si acepta.</p>}
              <p className="privacidad-texto">{aviso.datos.texto}</p>
              <details>
                <summary>Ver el aviso completo (versión {aviso.datos.version})</summary>
                <dl className="privacidad-detalle">
                  <dt>Responsable</dt><dd>{aviso.datos.responsable} · {aviso.datos.contacto}</dd>
                  <dt>Datos que se recogen</dt><dd>{aviso.datos.datos.join(', ')}</dd>
                  <dt>Para qué se usan</dt><dd><ul>{aviso.datos.finalidades.map((x) => <li key={x}>{x}</li>)}</ul></dd>
                  <dt>Dónde se guardan</dt><dd>{aviso.datos.almacenamiento}</dd>
                  <dt>Derechos del cliente</dt><dd>{aviso.datos.derechos}</dd>
                </dl>
              </details>
            </>
          )}
          <label className="privacidad-check">
            <input type="checkbox" checked={autoriza} onChange={(e) => { setAutoriza(e.target.checked); setErrores((x) => ({ ...x, autoriza_datos: '' })) }} />
            <span>{cliente ? 'El cliente autoriza el tratamiento de sus datos' : 'El cliente leyó el aviso y autoriza el tratamiento de sus datos'}</span>
          </label>
          {cliente?.fecha_autorizacion && (
            <span className="campo-ayuda">
              {cliente.autoriza_datos ? 'Autorizó' : 'Revocó la autorización dada'} el {fechaCorta(cliente.fecha_autorizacion)} (aviso versión {cliente.version_politica}).
            </span>
          )}
          {revoca && <span className="campo-msg">Al guardar se registra la revocatoria: el cliente sale del análisis de IA y se borran sus predicciones.</span>}
          {errores.autoriza_datos && <span className="campo-msg">{errores.autoriza_datos}</span>}
        </fieldset>

        <div className="pie-form">
          <button type="button" className="btn btn-fantasma" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-pri" disabled={enviando}>{enviando ? 'Guardando…' : cliente ? 'Guardar cambios' : 'Registrar cliente'}</button>
        </div>
      </form>
    </Modal>
  )
}
