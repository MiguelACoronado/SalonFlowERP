import { ArrowDownUp, Boxes, Minus, Package, Pencil, Plus, TriangleAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api, ApiError } from '../api/client'
import { Alerta, Badge, Campo, Cargando, Encabezado, Franja, Modal, Stat, useAviso, Vacio } from '../components/ui'
import { useApi } from '../components/useApi'
import type { Categoria, Movimiento, Producto } from '../types'

export default function Inventario() {
  const avisar = useAviso()
  const [categoria, setCategoria] = useState<string>('')
  const [soloBajos, setSoloBajos] = useState(false)
  const [modal, setModal] = useState<{ tipo: 'nuevo' } | { tipo: 'mov' | 'editar'; p: Producto } | null>(null)
  const productos = useApi(() => api.get<Producto[]>('/productos'))

  const todos = productos.datos ?? []
  const bajos = todos.filter((p) => p.estado === 'Stock bajo')
  const categorias = [...new Set(todos.map((p) => p.categoria))]
  const lista = todos.filter((p) => (!categoria || p.categoria === categoria) && (!soloBajos || p.estado === 'Stock bajo'))
  const listo = (m: string) => { setModal(null); avisar(m); productos.recargar() }

  async function ajustar(p: Producto, delta: number) {
    try {
      await api.post(`/productos/${p.id}/movimientos`, { cantidad: delta, motivo: 'Ajuste' })
      productos.recargar()
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'No se pudo ajustar el stock', 'error')
    }
  }

  return (
    <>
      <Encabezado titulo="Inventario" subtitulo="Productos e insumos del salón. Cada entrada o salida queda registrada.">
        <button className="btn btn-pri" onClick={() => setModal({ tipo: 'nuevo' })}><Plus aria-hidden />Agregar producto</button>
      </Encabezado>

      {productos.datos && (
        <Franja>
          <Stat icono={<Package />} etiqueta="Productos" valor={todos.length} nota={`En ${categorias.length} categorías`} />
          <Stat icono={<Boxes />} etiqueta="Unidades en stock" valor={todos.reduce((s, p) => s + p.stock, 0)} />
          <Stat icono={<TriangleAlert />} etiqueta="Por reponer" valor={bajos.length} alerta={bajos.length > 0}
            nota={bajos.length ? bajos.slice(0, 2).map((p) => p.nombre).join(', ') + (bajos.length > 2 ? ' y más' : '') : 'Todo por encima del mínimo'} />
        </Franja>
      )}

      <div className="herramientas">
        <div className="chips" role="group" aria-label="Filtrar por categoría">
          <button className="chip" aria-pressed={!categoria} onClick={() => setCategoria('')}>Todas</button>
          {categorias.map((c) => <button key={c} className="chip" aria-pressed={categoria === c} onClick={() => setCategoria(categoria === c ? '' : c)}>{c} <b>{todos.filter((p) => p.categoria === c).length}</b></button>)}
        </div>
        <button className="chip" aria-pressed={soloBajos} onClick={() => setSoloBajos(!soloBajos)} style={{ marginLeft: 'auto' }}>
          <i className="punto" style={{ background: 'var(--low)' }} />Solo por reponer <b>{bajos.length}</b>
        </button>
      </div>

      <div className="tabla-cont">
        {productos.error ? <Alerta texto={productos.error} onReintentar={productos.recargar} /> : productos.cargando ? <Cargando /> :
          !lista.length ? <Vacio texto="No hay productos con estos filtros." /> : (
            <table>
              <thead><tr><th>Producto</th><th>Nivel frente al mínimo</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {lista.map((p) => {
                  const tope = Math.max(p.minimo * 2, p.stock, 1)
                  return (
                    <tr key={p.id}>
                      <td><strong style={{ fontWeight: 600 }}>{p.nombre}</strong><br /><small>{p.categoria}</small></td>
                      <td>
                        <div className={`medidor ${p.estado === 'Stock bajo' ? 'bajo' : ''}`} title={`Mínimo: ${p.minimo}`}>
                          <div className="medidor-pista">
                            <div className="medidor-relleno" style={{ width: `${(p.stock / tope) * 100}%` }} />
                            <div className="medidor-min" style={{ left: `${(p.minimo / tope) * 100}%` }} />
                          </div>
                          <small className="nowrap">mín. {p.minimo}</small>
                        </div>
                      </td>
                      <td>
                        <div className="stepper">
                          <button className="icono-btn" style={{ width: 30, height: 30 }} aria-label={`Restar una unidad de ${p.nombre}`} onClick={() => ajustar(p, -1)} disabled={p.stock === 0}><Minus /></button>
                          <strong className="num" style={{ minWidth: 30, textAlign: 'center', display: 'inline-block', fontSize: 17 }}>{p.stock}</strong>
                          <button className="icono-btn" style={{ width: 30, height: 30 }} aria-label={`Sumar una unidad de ${p.nombre}`} onClick={() => ajustar(p, 1)}><Plus /></button>
                        </div>
                      </td>
                      <td><Badge texto={p.estado === 'Stock bajo' ? 'Por reponer' : 'Disponible'} clase={p.estado === 'Stock bajo' ? 'low' : 'ok'} /></td>
                      <td className="acciones-fila">
                        <button className="btn btn-sec btn-sm" onClick={() => setModal({ tipo: 'mov', p })}><ArrowDownUp aria-hidden />Movimiento</button>
                        <button className="btn btn-fantasma btn-sm" onClick={() => setModal({ tipo: 'editar', p })} aria-label={`Editar ${p.nombre}`}><Pencil aria-hidden /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>

      {modal?.tipo === 'nuevo' && <FormProducto onCerrar={() => setModal(null)} onGuardado={listo} />}
      {modal?.tipo === 'editar' && <FormProducto producto={modal.p} onCerrar={() => setModal(null)} onGuardado={listo} />}
      {modal?.tipo === 'mov' && <FormMovimiento producto={modal.p} onCerrar={() => setModal(null)} onGuardado={listo} />}
    </>
  )
}

function FormProducto({ producto, onCerrar, onGuardado }: { producto?: Producto; onCerrar: () => void; onGuardado: (msg: string) => void }) {
  const categorias = useApi(() => api.get<Categoria[]>('/categorias'))
  const [f, setF] = useState({
    nombre: producto?.nombre ?? '', categoria_id: producto ? String(producto.categoria_id) : '',
    stock: '0', minimo: producto ? String(producto.minimo) : '5',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState('')
  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setErrores((e) => ({ ...e, [k]: '' })) }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (f.nombre.trim().length < 3) errs.nombre = 'Mínimo 3 caracteres.'
    if (!f.categoria_id) errs.categoria_id = 'Elige una categoría.'
    if (!producto && !/^\d+$/.test(f.stock)) errs.stock = 'Debe ser un número entero de 0 en adelante.'
    if (!/^\d+$/.test(f.minimo)) errs.minimo = 'Debe ser un número entero de 0 en adelante.'
    setErrores(errs)
    setGeneral('')
    if (Object.keys(errs).length) return
    try {
      if (producto) {
        await api.patch(`/productos/${producto.id}`, { nombre: f.nombre, categoria_id: Number(f.categoria_id), minimo: Number(f.minimo) })
        onGuardado(`${f.nombre} actualizado`)
      } else {
        await api.post('/productos', { nombre: f.nombre, categoria_id: Number(f.categoria_id), stock: Number(f.stock), minimo: Number(f.minimo) })
        onGuardado(`${f.nombre} agregado al inventario`)
      }
    } catch (err) {
      if (err instanceof ApiError) { setGeneral(err.message); setErrores(err.porCampo()) }
    }
  }

  return (
    <Modal titulo={producto ? `Editar ${producto.nombre}` : 'Agregar producto'} onCerrar={onCerrar}>
      <form className="form" onSubmit={guardar} noValidate>
        {general && <div className="alerta" role="alert">{general}</div>}
        <Campo etiqueta="Nombre" error={errores.nombre}><input value={f.nombre} maxLength={100} onChange={(e) => set('nombre', e.target.value)} autoFocus /></Campo>
        <Campo etiqueta="Categoría" error={errores.categoria_id}>
          <select value={f.categoria_id} onChange={(e) => set('categoria_id', e.target.value)}>
            <option value="">Selecciona…</option>
            {categorias.datos?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Campo>
        <div className="fila-2">
          {!producto && <Campo etiqueta="Stock inicial" error={errores.stock}><input type="number" min={0} value={f.stock} onChange={(e) => set('stock', e.target.value)} /></Campo>}
          <Campo etiqueta="Stock mínimo" error={errores.minimo} ayuda="Por debajo de este número se avisa para reponer."><input type="number" min={0} value={f.minimo} onChange={(e) => set('minimo', e.target.value)} /></Campo>
        </div>
        {producto && <p className="nota">Para cambiar el stock registra un movimiento; así queda el historial.</p>}
        <div className="pie-form">
          <button type="button" className="btn btn-fantasma" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-pri">{producto ? 'Guardar cambios' : 'Agregar producto'}</button>
        </div>
      </form>
    </Modal>
  )
}

function FormMovimiento({ producto, onCerrar, onGuardado }: { producto: Producto; onCerrar: () => void; onGuardado: (msg: string) => void }) {
  const historial = useApi(() => api.get<Movimiento[]>(`/productos/${producto.id}/movimientos`))
  const [motivo, setMotivo] = useState<'Compra' | 'Consumo' | 'Ajuste'>('Compra')
  const [cantidad, setCantidad] = useState('1')
  const [error, setError] = useState('')

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const n = Number(cantidad)
    if (!Number.isInteger(n) || n <= 0) return setError('Escribe una cantidad entera mayor que 0.')
    const delta = motivo === 'Consumo' ? -n : n
    if (producto.stock + delta < 0) return setError(`Solo hay ${producto.stock} unidades disponibles.`)
    try {
      await api.post(`/productos/${producto.id}/movimientos`, { cantidad: delta, motivo })
      onGuardado(`${motivo} registrada: ${delta > 0 ? '+' : ''}${delta} de ${producto.nombre}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el movimiento.')
    }
  }

  return (
    <Modal titulo={producto.nombre} onCerrar={onCerrar}>
      <p className="sub" style={{ marginTop: 0 }}>Hay <strong className="num">{producto.stock}</strong> unidades. El mínimo es {producto.minimo}.</p>
      <form className="form" onSubmit={guardar} noValidate>
        <div className="segmento" role="group" aria-label="Tipo de movimiento">
          {(['Compra', 'Consumo', 'Ajuste'] as const).map((m) => (
            <button type="button" key={m} aria-pressed={motivo === m} onClick={() => { setMotivo(m); setError('') }}>
              {m === 'Compra' ? 'Compra (entra)' : m === 'Consumo' ? 'Consumo (sale)' : 'Ajuste (suma)'}
            </button>
          ))}
        </div>
        <Campo etiqueta="Cantidad" error={error}><input type="number" min={1} value={cantidad} onChange={(e) => { setCantidad(e.target.value); setError('') }} /></Campo>
        <div className="pie-form">
          <button type="button" className="btn btn-fantasma" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-pri">Registrar {motivo.toLowerCase()}</button>
        </div>
      </form>
      <h4>Últimos movimientos</h4>
      {historial.cargando ? <Cargando /> : !historial.datos?.length ? <Vacio texto="Todavía no hay movimientos." /> : (
        <ul className="lista-simple">
          {historial.datos.slice(0, 8).map((m) => (
            <li key={m.id}><span>{m.motivo} <small>{new Date(m.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</small></span><strong className={`num ${m.cantidad < 0 ? 'neg' : 'pos'}`}>{m.cantidad > 0 ? '+' : ''}{m.cantidad}</strong></li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
