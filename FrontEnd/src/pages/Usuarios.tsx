import { Pencil, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Alerta, Avatar, Badge, Campo, Cargando, Encabezado, Modal, useAviso } from '../components/ui'
import { useApi } from '../components/useApi'
import type { Estilista, Rol, Usuario } from '../types'
import { ROLES } from '../utils/format'

export default function Usuarios() {
  const avisar = useAviso()
  const { usuario: yo } = useAuth()
  const usuarios = useApi(() => api.get<Usuario[]>('/usuarios'))
  const estilistas = useApi(() => api.get<Estilista[]>('/estilistas'))
  const [editando, setEditando] = useState<Usuario | 'nuevo' | null>(null)

  async function alternar(u: Usuario) {
    try {
      await api.patch(`/usuarios/${u.id}`, { activo: !u.activo })
      avisar(u.activo ? `${u.nombre} desactivado` : `${u.nombre} activado`)
      usuarios.recargar()
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'Error', 'error')
    }
  }
  const nombreEstilista = (id: number | null) => estilistas.datos?.find((e) => e.id === id)?.nombre ?? '—'

  return (
    <>
      <Encabezado titulo="Usuarios" subtitulo="Quién puede entrar al sistema. Recepción maneja citas, clientes e inventario; cada estilista ve solo su agenda y su comisión.">
        <button className="btn btn-pri" onClick={() => setEditando('nuevo')}><Plus aria-hidden />Crear usuario</button>
      </Encabezado>
      {usuarios.error ? <Alerta texto={usuarios.error} /> : usuarios.cargando ? <Cargando /> : (
        <div className="tabla-cont">
          <table>
            <thead><tr><th>Usuario</th><th>Rol</th><th>Estilista vinculado</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {usuarios.datos?.map((u) => (
                <tr key={u.id}>
                  <td><div className="celda-persona"><Avatar nombre={u.nombre} /><div><strong style={{ fontWeight: 600 }}>{u.nombre}</strong><small>{u.email}</small></div></div></td><td>{ROLES[u.rol]}</td><td>{u.rol === 'estilista' ? nombreEstilista(u.estilista_id) : '—'}</td>
                  <td><Badge texto={u.activo ? 'Activo' : 'Inactivo'} clase={u.activo ? 'ok' : 'muted'} /></td>
                  <td className="acciones-fila">
                    <button className="btn btn-sm btn-fantasma" onClick={() => setEditando(u)}><Pencil aria-hidden />Editar</button>
                    {u.id !== yo?.id && <button className="btn btn-sm btn-sec" onClick={() => alternar(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editando && <FormUsuario usuario={editando === 'nuevo' ? null : editando} estilistas={estilistas.datos ?? []}
        onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); avisar('Usuario guardado'); usuarios.recargar() }} />}
    </>
  )
}

function FormUsuario({ usuario, estilistas, onCerrar, onGuardado }: {
  usuario: Usuario | null; estilistas: Estilista[]; onCerrar: () => void; onGuardado: () => void
}) {
  const [f, setF] = useState({
    nombre: usuario?.nombre ?? '', email: usuario?.email ?? '', password: '',
    rol: (usuario?.rol ?? 'recepcion') as Rol, estilista_id: usuario?.estilista_id ? String(usuario.estilista_id) : '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState('')

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (f.nombre.trim().length < 3) errs.nombre = 'Mínimo 3 caracteres.'
    if (!usuario && !/^\S+@\S+\.\S+$/.test(f.email)) errs.email = 'Correo inválido.'
    if ((!usuario || f.password) && !(f.password.length >= 8 && /\d/.test(f.password) && /[a-zA-Z]/.test(f.password)))
      errs.password = 'Mínimo 8 caracteres, con letras y números.'
    if (f.rol === 'estilista' && !f.estilista_id) errs.estilista_id = 'Vincula el usuario a un estilista.'
    setErrores(errs)
    setGeneral('')
    if (Object.keys(errs).length) return
    const estilista_id = f.rol === 'estilista' ? Number(f.estilista_id) : null
    try {
      if (usuario) {
        await api.patch(`/usuarios/${usuario.id}`, { nombre: f.nombre, rol: f.rol, estilista_id, ...(f.password ? { password: f.password } : {}) })
      } else {
        await api.post('/usuarios', { ...f, estilista_id })
      }
      onGuardado()
    } catch (err) {
      if (err instanceof ApiError) { setGeneral(err.message); setErrores(err.porCampo()) }
    }
  }

  return (
    <Modal titulo={usuario ? `Editar ${usuario.nombre}` : 'Crear usuario'} onCerrar={onCerrar}>
      <form className="form" onSubmit={guardar} noValidate>
        {general && <div className="alerta">{general}</div>}
        <Campo etiqueta="Nombre" error={errores.nombre}><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
        <Campo etiqueta="Correo" error={errores.email}><input type="email" value={f.email} disabled={!!usuario} onChange={(e) => setF({ ...f, email: e.target.value })} /></Campo>
        <Campo etiqueta={usuario ? 'Nueva contraseña (opcional)' : 'Contraseña'} error={errores.password}>
          <input type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Campo>
        <div className="fila-2">
          <Campo etiqueta="Rol" error={errores.rol}>
            <select value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value as Rol })}>
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Campo>
          {f.rol === 'estilista' && (
            <Campo etiqueta="Estilista" error={errores.estilista_id}>
              <select value={f.estilista_id} onChange={(e) => setF({ ...f, estilista_id: e.target.value })}>
                <option value="">Selecciona…</option>
                {estilistas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Campo>
          )}
        </div>
        <div className="pie-form">
          <button type="button" className="btn btn-fantasma" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-pri">{usuario ? 'Guardar cambios' : 'Crear usuario'}</button>
        </div>
      </form>
    </Modal>
  )
}
