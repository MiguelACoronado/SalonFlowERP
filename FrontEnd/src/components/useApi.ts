import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'

/** Carga datos de la API con estados de carga y error, y permite recargar. */
export function useApi<T>(cargar: () => Promise<T>, deps: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recargar = useCallback(() => {
    setCargando(true)
    setError(null)
    return cargar()
      .then((d) => setDatos(d))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error inesperado.'))
      .finally(() => setCargando(false))
  }, deps)

  useEffect(() => { recargar() }, [recargar])
  return { datos, error, cargando, recargar, setDatos }
}
