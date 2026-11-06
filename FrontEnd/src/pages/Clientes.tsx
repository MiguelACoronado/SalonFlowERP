import { CalendarDays, Pencil, Phone, Plus, Search } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, ApiError } from '../api/client'
import { NuevaCita } from '../components/Citas'
import { Alerta, Avatar, Badge, BadgeEstado, Campo, Cargando, Encabezado, Modal, useAviso, Vacio } from '../components/ui'
import { useApi } from '../components/useApi'
import type { Cita, Cliente, Estilista, Servicio } from '../types'
import { fechaCorta, hora12, hoyISO, pesos } from '../utils/format'

type Filtro = 'todos' | 'inactivos' | 'nuevos'

export default function Clientes() {
  const avisar = useAviso()
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [seleccion, setSeleccion] = useState<number | null>(null)
  const [editando, setEditando] = useState<Cliente | 'nuevo' | null>(null)
  const [agendar, setAgendar] = useState<Cliente | null>(null)
  const estilistas = useApi(() => api.get<Estilista[]>('/estilistas'))

  // Espera 300 ms después de escribir para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto.trim()), 300)
    return () => clearTimeout(t)
  }, [texto])

  const clientes = useApi(() => api.get<Cliente[]>('/clientes', { q: busqueda }), [busqueda])
  const todos = clientes.datos ?? []
  const inactivos = todos.filter((c) => (c.dias_sin_visita ?? 0) > 30)
  const nuevos = todos.filter((c) => !c.ultima_visita)
  const lista = filtro === 'inactivos' ? inactivos : filtro === 'nuevos' ? nuevos : todos
  const elegido = todos.find((c) => c.id === seleccion) ?? null

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
          <button className="chip" aria-pressed={filtro === 'inactivos'} onClick={() => setFiltro('inactivos')}>Sin venir hace +30 días <b>{inactivos.length}</b></button>
          <button className="chip" aria-pressed={filtro === 'nuevos'} onClick={() => setFiltro('nuevos')}>Sin visitas aún <b>{nuevos.length}</b></button>
        </div>
      </div>

      <div className="tabla-cont">
        {clientes.error ? <Alerta texto={clientes.error} onReintentar={clientes.recargar} /> : clientes.cargando ? <Cargando /> :
          !lista.length ? <Vacio texto={busqueda ? `Ningún cliente coincide con "${busqueda}".` : 'No hay clientes en este grupo.'} /> : (
            <table>
              <thead><tr><th>Cliente</th><th>Teléfono</th><th>Servicio frecuente</th><th>Última visita</th><th></th></tr></thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className="fila-click" onClick={() => setSeleccion(c.id)}>
                    <td>
                      <div className="celda-persona">
                        <Avatar nombre={c.nombre} />
                        <button className="enlace-celda" onClick={() => setSeleccion(c.id)}>{c.nombre}</button>
                      </div>
                    </td>
                    <td className="nowrap">{c.telefono}</td>
                    <td>{c.servicio_frecuente ?? <small>Sin definir</small>}</td>
                    <td className="nowrap">
                      {c.ultima_visita ? <>{fechaCorta(c.ultima_visita)} {(c.dias_sin_visita ?? 0) > 30 && <Badge texto={`${c.dias_sin_visita} días`} clase="wait" />}</> : <Badge texto="Nuevo" clase="info" />}
                    </td>
                    <td className="acciones-fila"><span className="enlace">Ver ficha</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {elegido && (
        <Modal titulo="Ficha del cliente" onCerrar={() => setSeleccion(null)}>
          <Ficha cliente={elegido} onEditar={() => { setEditando(elegido); setSeleccion(null) }} onAgendar={() => { setAgendar(elegido); setSeleccion(null) }} />
        </Modal>
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

function Ficha({ cliente, onEditar, onAgendar }: { cliente: Cliente; onEditar: () => void; onAgendar: () => void }) {
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
  const [f, setF] = useState({
    nombre: cliente?.nombre ?? '', telefono: cliente?.telefono ?? '',
    servicio_frecuente_id: cliente?.servicio_frecuente_id ? String(cliente.servicio_frecuente_id) : '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setErrores((e) => ({ ...e, [k]: '' })) }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (f.nombre.trim().length < 3) errs.nombre = 'Escribe el nombre completo (mínimo 3 letras).'
    else if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(f.nombre.trim())) errs.nombre = 'El nombre solo puede tener letras.'
    const digitos = f.telefono.replace(/\D/g, '')
    if (![7, 10].includes(digitos.length)) errs.telefono = 'El teléfono debe tener 10 dígitos (celular) o 7 (fijo).'
    setErrores(errs)
    setGeneral('')
    if (Object.keys(errs).length) return
    setEnviando(true)
    const cuerpo = { ...f, servicio_frecuente_id: f.servicio_frecuente_id ? Number(f.servicio_frecuente_id) : null }
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
        <div className="pie-form">
          <button type="button" className="btn btn-fantasma" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-pri" disabled={enviando}>{enviando ? 'Guardando…' : cliente ? 'Guardar cambios' : 'Registrar cliente'}</button>
        </div>
      </form>
    </Modal>
  )
}
