import {
  CalendarDays, ChartColumn, ChevronDown, House, LogOut, Menu, Package, Scissors, UserCog, Users, Wallet, X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { Rol } from '../types'
import { ROLES } from '../utils/format'
import { Avatar } from './ui'

type Opcion = { ruta: string; texto: string; icono: LucideIcon; roles: Rol[] }
const TODOS: Rol[] = ['admin', 'recepcion', 'estilista']

// Navegación principal (barra superior)
const PRINCIPAL: Opcion[] = [
  { ruta: '/', texto: 'Inicio', icono: House, roles: TODOS },
  { ruta: '/citas', texto: 'Agenda', icono: CalendarDays, roles: TODOS },
  { ruta: '/clientes', texto: 'Clientes', icono: Users, roles: ['admin', 'recepcion'] },
  { ruta: '/inventario', texto: 'Inventario', icono: Package, roles: ['admin', 'recepcion'] },
  { ruta: '/comisiones', texto: 'Comisiones', icono: Wallet, roles: ['admin', 'estilista'] },
  { ruta: '/reportes', texto: 'Reportes', icono: ChartColumn, roles: ['admin'] },
]
// Configuración (menú del usuario)
const CONFIG: Opcion[] = [
  { ruta: '/servicios', texto: 'Servicios y precios', icono: Scissors, roles: ['admin'] },
  { ruta: '/usuarios', texto: 'Usuarios', icono: UserCog, roles: ['admin'] },
]

export default function Layout() {
  const { usuario, logout, tiene } = useAuth()
  const [menuUsuario, setMenuUsuario] = useState(false)
  const [menuMovil, setMenuMovil] = useState(false)
  const caja = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const principal = PRINCIPAL.filter((o) => tiene(...o.roles))
  const config = CONFIG.filter((o) => tiene(...o.roles))

  // Cerrar menús al navegar o al hacer clic fuera
  useEffect(() => {
    const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setMenuUsuario(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])
  const cerrar = () => { setMenuUsuario(false); setMenuMovil(false) }
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  const enlace = ({ ruta, texto, icono: Icono }: Opcion) => (
    <NavLink key={ruta} to={ruta} end={ruta === '/'} onClick={cerrar}><Icono aria-hidden />{texto}</NavLink>
  )

  return (
    <div className="app">
      <header className="cabecera">
        <div className="cabecera-in">
          <div className="marca">
            <span className="marca-poste" aria-hidden />
            <div>
              <div className="marca-nombre">SalonFlow</div>
              <div className="marca-sub">Barbería y peluquería</div>
            </div>
          </div>
          <nav className="nav-sup" aria-label="Navegación principal">{principal.map(enlace)}</nav>

          <div className="usuario-menu" ref={caja}>
            <button className="usuario-btn" aria-label={`Menú de ${usuario?.nombre}`} aria-expanded={menuUsuario} aria-haspopup="menu" onClick={() => setMenuUsuario(!menuUsuario)}>
              <Avatar nombre={usuario?.nombre ?? '?'} />
              <ChevronDown size={16} aria-hidden />
            </button>
            {menuUsuario && (
              <div className="desplegable" role="menu">
                <div className="quien"><strong>{usuario?.nombre}</strong><small>{ROLES[usuario?.rol ?? '']}, {usuario?.email}</small></div>
                <hr />
                {config.length > 0 && <><div className="titulo">Configuración</div>{config.map(enlace)}<hr /></>}
                <button onClick={logout}><LogOut aria-hidden />Cerrar sesión</button>
              </div>
            )}
          </div>
          <button className="icono-btn hamburguesa" aria-label={menuMovil ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuMovil} onClick={() => setMenuMovil(!menuMovil)}>
            {menuMovil ? <X /> : <Menu />}
          </button>
        </div>
        {menuMovil && (
          <nav className="menu-movil" aria-label="Menú">
            {principal.map(enlace)}
            {config.length > 0 && <><div className="titulo">Configuración</div>{config.map(enlace)}</>}
            <button onClick={logout}><LogOut aria-hidden />Cerrar sesión ({usuario?.nombre})</button>
          </nav>
        )}
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  )
}
