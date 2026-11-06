import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Campo } from '../components/ui'

export default function Login() {
  const { usuario, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to="/" replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Escribe un correo válido.'
    if (!password) errs.password = 'Escribe tu contraseña.'
    setErrores(errs)
    setGeneral('')
    if (Object.keys(errs).length) return
    setEnviando(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      if (err instanceof ApiError) {
        setGeneral(err.message)
        setErrores(err.porCampo())
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login">
      <div className="login-arte">
        <h1>Tu barbería, al día.</h1>
        <p>Agenda por silla, clientes, inventario, comisiones y reportes en un solo lugar.</p>
      </div>
      <form className="login-form" onSubmit={enviar} noValidate>
        <div className="marca" style={{ padding: 0 }}>
          <span className="marca-poste" aria-hidden />
          <div><div className="marca-nombre">SalonFlow</div><div className="marca-sub">Barbería y peluquería</div></div>
        </div>
        <h2>Inicia sesión</h2>
        <p className="sub">Usa el correo con el que te registró el administrador.</p>
        {general && <div className="alerta" role="alert">{general}</div>}
        <Campo etiqueta="Correo" error={errores.email}>
          <input type="email" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); setErrores((x) => ({ ...x, email: '' })) }} autoFocus />
        </Campo>
        <Campo etiqueta="Contraseña" error={errores.password}>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setErrores((x) => ({ ...x, password: '' })) }} />
        </Campo>
        <button className="btn btn-pri ancho" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        <details className="demo">
          <summary>Usuarios de demostración</summary>
          <ul>
            <li><code>admin@salonflow.co</code> con <code>Admin123*</code></li>
            <li><code>recepcion@salonflow.co</code> con <code>Recepcion123*</code></li>
            <li><code>hector@salonflow.co</code> con <code>Estilista123*</code></li>
          </ul>
        </details>
      </form>
    </div>
  )
}
