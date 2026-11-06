import type { ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import { AvisosProvider, Cargando } from './components/ui'
import Citas from './pages/Citas'
import Clientes from './pages/Clientes'
import Comisiones from './pages/Comisiones'
import Inicio from './pages/Inicio'
import Inventario from './pages/Inventario'
import Login from './pages/Login'
import Reportes from './pages/Reportes'
import Servicios from './pages/Servicios'
import Usuarios from './pages/Usuarios'
import type { Rol } from './types'

/** Protege rutas: exige sesión y, opcionalmente, uno de los roles indicados. */
function Protegida({ roles, children }: { roles?: Rol[]; children: ReactNode }) {
  const { usuario, cargando, tiene } = useAuth()
  if (cargando) return <Cargando texto="Verificando sesión…" />
  if (!usuario) return <Navigate to="/login" replace />
  if (roles && !tiene(...roles)) return <SinPermiso />
  return <>{children}</>
}

function SinPermiso() {
  return <div className="vacio"><h2>Sin permiso</h2><p>Tu rol no tiene acceso a esta sección.</p><Link to="/">Volver al inicio</Link></div>
}

export default function App() {
  return (
    <AuthProvider>
      <AvisosProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protegida><Layout /></Protegida>}>
              <Route index element={<Inicio />} />
              <Route path="citas" element={<Citas />} />
              <Route path="clientes" element={<Protegida roles={['admin', 'recepcion']}><Clientes /></Protegida>} />
              <Route path="inventario" element={<Protegida roles={['admin', 'recepcion']}><Inventario /></Protegida>} />
              <Route path="comisiones" element={<Protegida roles={['admin', 'estilista']}><Comisiones /></Protegida>} />
              <Route path="reportes" element={<Protegida roles={['admin']}><Reportes /></Protegida>} />
              <Route path="servicios" element={<Protegida roles={['admin']}><Servicios /></Protegida>} />
              <Route path="usuarios" element={<Protegida roles={['admin']}><Usuarios /></Protegida>} />
              <Route path="*" element={<div className="vacio"><h2>Página no encontrada</h2><Link to="/">Volver al inicio</Link></div>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AvisosProvider>
    </AuthProvider>
  )
}
