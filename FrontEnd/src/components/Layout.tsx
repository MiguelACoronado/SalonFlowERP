import {
  CalendarDays, ChartColumn, Ellipsis, House, LogOut, Package, Plus, Scissors, Sparkles, UserCog, Users, Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { Estilista, Rol } from '../types'
import { hoyISO, ROLES } from '../utils/format'
import { NuevaCita } from './Citas'
import { Avatar, useAviso } from './ui'

type Opcion = { ruta: string; texto: string; icono: LucideIcon; roles: Rol[] }
const TODOS: Rol[] = ['admin', 'recepcion', 'estilista']

const PRINCIPAL: Opcion[] = [
  { ruta: '/', texto: 'Inicio', icono: House, roles: TODOS },
  { ruta: '/citas', texto: 'Agenda', icono: CalendarDays, roles: TODOS },
  { ruta: '/clientes', texto: 'Clientes', icono: Users, roles: ['admin', 'recepcion'] },
  { ruta: '/inventario', texto: 'Inventario', icono: Package, roles: ['admin', 'recepcion'] },
  { ruta: '/comisiones', texto: 'Comisiones', icono: Wallet, roles: ['admin', 'estilista'] },
  { ruta: '/reportes', texto: 'Reportes', icono: ChartColumn, roles: ['admin'] },
  { ruta: '/ia', texto: 'IA', icono: Sparkles, roles: ['admin'] },
]
const CONFIG: Opcion[] = [
  { ruta: '/servicios', texto: 'Servicios y precios', icono: Scissors, roles: ['admin'] },
  { ruta: '/usuarios', texto: 'Usuarios', icono: UserCog, roles: ['admin'] },
]

export default function Layout() {
  const { usuario, logout, tiene } = useAuth()
  const avisar = useAviso()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const [menu, setMenu] = useState(false)
  const [nueva, setNueva] = useState<Estilista[] | null>(null)
  const [version, setVersion] = useState(0)      // al cambiar, la página actual se vuelve a cargar
  const caja = useRef<HTMLDivElement>(null)
  const mas = useRef<HTMLButtonElement>(null)

  const principal = PRINCIPAL.filter((o) => tiene(...o.roles))
  const config = CONFIG.filter((o) => tiene(...o.roles))
  const puedeAgendar = tiene('admin', 'recepcion')
  // En celular: dos accesos, el botón "+", uno más y "Más" para el resto
  const movil = principal.slice(0, 3)
  const resto = principal.slice(3)

  useEffect(() => { setMenu(false); window.scrollTo(0, 0) }, [pathname])
  useEffect(() => {
    if (!menu) return
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node
      if (!caja.current?.contains(t) && !mas.current?.contains(t)) setMenu(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('mousedown', fuera)
    window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); window.removeEventListener('keydown', esc) }
  }, [menu])

  async function abrirNueva() {
    try {
      setNueva(await api.get<Estilista[]>('/estilistas'))
    } catch {
      avisar('No se pudo cargar la lista de estilistas.', 'error')
    }
  }

  const enlace = ({ ruta, texto, icono: Icono }: Opcion) => (
    <NavLink key={ruta} to={ruta} end={ruta === '/'}><Icono aria-hidden />{texto}</NavLink>
  )

  return (
    <div className="app">
      <header className="barra-sup">
        <NavLink to="/" className="logo" aria-label="SalonFlow, inicio"><img src="/favicon.svg" alt="" className="logo-img" /><span className="marcador">Salon<span>Flow</span></span></NavLink>
        <nav className="nav-escritorio" aria-label="Navegación principal">
          {principal.map(({ ruta, texto }) => <NavLink key={ruta} to={ruta} end={ruta === '/'}>{texto}</NavLink>)}
        </nav>
        <div className="barra-derecha" ref={caja}>
          {puedeAgendar && (
            <button className="btn btn-pri btn-sm solo-escritorio" onClick={abrirNueva}><Plus aria-hidden />Agendar cita</button>
          )}
          <button className="btn-menu" onClick={() => setMenu((m) => !m)} aria-label="Menú de usuario" aria-expanded={menu} aria-haspopup="menu">
            <span /><span /><span />
          </button>
          {menu && (
            <div className="menu-usuario" role="menu">
              <div className="quien">
                <Avatar nombre={usuario?.nombre ?? '?'} />
                <div>
                  <strong>{usuario?.nombre}</strong>
                  <span className="usuario">{ROLES[usuario?.rol ?? '']}</span>
                  <span className="menu-correo">{usuario?.email}</span>
                </div>
              </div>
              {resto.length > 0 && <div className="menu-links solo-movil">{resto.map(enlace)}</div>}
              {config.length > 0 && <><div className="menu-titulo">Configuración</div><div className="menu-links">{config.map(enlace)}</div></>}
              <button className="btn btn-sec btn-sm ancho" onClick={logout}><LogOut aria-hidden />Cerrar sesión</button>
            </div>
          )}
        </div>
      </header>

      <main className="contenido">
        <Outlet key={version} />
      </main>

      {/* Navegación inferior en celular */}
      <nav className="nav-movil" aria-label="Navegación">
        {movil.slice(0, 2).map(({ ruta, texto, icono: Icono }) => (
          <NavLink key={ruta} to={ruta} end={ruta === '/'}><Icono aria-hidden />{texto}</NavLink>
        ))}
        {puedeAgendar && <button className="nav-mas" onClick={abrirNueva} aria-label="Agendar cita"><Plus /></button>}
        {movil.slice(2).map(({ ruta, texto, icono: Icono }) => (
          <NavLink key={ruta} to={ruta}><Icono aria-hidden />{texto}</NavLink>
        ))}
        <button ref={mas} onClick={() => setMenu((m) => !m)} aria-expanded={menu}><Ellipsis aria-hidden />Más</button>
      </nav>

      {nueva && (
        <NuevaCita inicial={{ fecha: hoyISO() }} estilistas={nueva} onCerrar={() => setNueva(null)}
          onCreada={(c) => {
            setNueva(null)
            avisar(`Cita agendada para ${c.cliente}`)
            if (pathname === '/' || pathname === '/citas') setVersion((v) => v + 1)
            else navegar('/citas')
          }} />
      )}
    </div>
  )
}
