import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, onSesionExpirada, token } from '../api/client'
import type { Rol, Usuario } from '../types'

interface Auth {
  usuario: Usuario | null
  cargando: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  tiene: (...roles: Rol[]) => boolean
}

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(() => !!token.get())

  const logout = useCallback(() => {
    token.clear()
    setUsuario(null)
  }, [])

  useEffect(() => {
    onSesionExpirada(logout)
    if (!token.get()) return
    api.get<Usuario>('/auth/me')
      .then(setUsuario)
      .catch(() => token.clear())
      .finally(() => setCargando(false))
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.post<{ access_token: string; usuario: Usuario }>('/auth/login', { email, password })
    token.set(r.access_token)
    setUsuario(r.usuario)
  }, [])

  const valor = useMemo<Auth>(() => ({
    usuario, cargando, login, logout,
    tiene: (...roles) => !!usuario && roles.includes(usuario.rol),
  }), [usuario, cargando, login, logout])

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): Auth {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
