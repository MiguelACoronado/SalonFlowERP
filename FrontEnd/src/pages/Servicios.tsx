import { Pencil, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api, ApiError } from '../api/client'
import { Alerta, Badge, Campo, Cargando, Encabezado, Modal, useAviso } from '../components/ui'
import { useApi } from '../components/useApi'
import type { Servicio } from '../types'
import { pesos } from '../utils/format'

export default function Servicios() {
  const avisar = useAviso()
  const servicios = useApi(() => api.get<Servicio[]>('/servicios', { incluir_inactivos: true }))
  const [editando, setEditando] = useState<Servicio | 'nuevo' | null>(null)

  async function alternar(s: Servicio) {
    try {
      await api.patch(`/servicios/${s.id}`, { activo: !s.activo })
      avisar(s.activo ? `${s.nombre} desactivado` : `${s.nombre} activado`)
      servicios.recargar()
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'Error', 'error')
    }
  }

  return (
    <>
      <Encabezado titulo="Servicios y precios" subtitulo="Lo que ofrece el salón. Las citas ya agendadas conservan el precio con que se agendaron.">
        <button className="btn btn-pri" onClick={() => setEditando('nuevo')}><Plus aria-hidden />Agregar servicio</button>
      </Encabezado>
      {servicios.error ? <Alerta texto={servicios.error} /> : servicios.cargando ? <Cargando /> : (
        <div className="tabla-cont">
          <table>
            <thead><tr><th>Servicio</th><th className="der">Precio</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {servicios.datos?.map((s) => (
                <tr key={s.id}>
                  <td><strong style={{ fontWeight: 600 }}>{s.nombre}</strong></td><td className="der num">{pesos(s.precio)}</td>
                  <td><Badge texto={s.activo ? 'Activo' : 'Inactivo'} clase={s.activo ? 'ok' : 'muted'} /></td>
                  <td className="acciones-fila">
                    <button className="btn btn-sm btn-fantasma" onClick={() => setEditando(s)}><Pencil aria-hidden />Editar</button>
                    <button className="btn btn-sm btn-sec" onClick={() => alternar(s)}>{s.activo ? 'Desactivar' : 'Activar'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editando && <FormServicio servicio={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)}
        onGuardado={() => { setEditando(null); avisar('Servicio guardado'); servicios.recargar() }} />}
    </>
  )
}

function FormServicio({ servicio, onCerrar, onGuardado }: { servicio: Servicio | null; onCerrar: () => void; onGuardado: () => void }) {
  const [nombre, setNombre] = useState(servicio?.nombre ?? '')
  const [precio, setPrecio] = useState(servicio ? String(Number(servicio.precio)) : '')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState('')

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (nombre.trim().length < 3) errs.nombre = 'Mínimo 3 caracteres.'
    if (!(Number(precio) > 0)) errs.precio = 'El precio debe ser mayor que 0.'
    setErrores(errs)
    if (Object.keys(errs).length) return
    try {
      const cuerpo = { nombre, precio: Number(precio) }
      if (servicio) await api.patch(`/servicios/${servicio.id}`, cuerpo)
      else await api.post('/servicios', cuerpo)
      onGuardado()
    } catch (err) {
      if (err instanceof ApiError) { setGeneral(err.message); setErrores(err.porCampo()) }
    }
  }

  return (
    <Modal titulo={servicio ? 'Editar servicio' : 'Agregar servicio'} onCerrar={onCerrar}>
      <form className="form" onSubmit={guardar} noValidate>
        {general && <div className="alerta">{general}</div>}
        <Campo etiqueta="Nombre" error={errores.nombre}><input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus /></Campo>
        <Campo etiqueta="Precio (COP)" error={errores.precio} ayuda="Las citas ya agendadas conservan su precio."><input type="number" min={1} step={1000} value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>
        <div className="pie-form">
          <button type="button" className="btn btn-fantasma" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-pri">{servicio ? 'Guardar cambios' : 'Agregar servicio'}</button>
        </div>
      </form>
    </Modal>
  )
}
