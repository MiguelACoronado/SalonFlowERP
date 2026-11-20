import { Play } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Chispas, Corona, Estrella, Flecha, Garabato, Mancha, Rayo, Subrayado } from '../components/Doodles'
import { Campo } from '../components/ui'

const MODULOS = ['Agenda', 'Clientes', 'Inventario', 'Comisiones', 'Reportes']

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
      <Mancha className="mancha mancha-a" color="#B9922F" variante={0} />
      <Mancha className="mancha mancha-b" color="#4A141E" variante={1} />
      <Mancha className="mancha mancha-c" color="#F7F2E9" variante={2} />

      <section className="login-hero">
        <p className="saludo marcador">Hola, maestro <Flecha className="flecha-saludo" /></p>
        <h1 className="titulo-gigante marcador">
          Tu barbería,<br />al día
          <Subrayado className="subrayado" />
          <Corona className="doodle corona" />
        </h1>
        <p className="tagline">{MODULOS.map((m, i) => <span key={m}>{i > 0 && <b>•</b>}{m}</span>)}</p>
        <div className="burbuja marcador">¡Sin cruces de horario!</div>
        <Estrella className="doodle estrella-1" />
        <Rayo className="doodle rayo-1" />
        <Chispas className="doodle chispas-1" />
        <Garabato className="doodle garabato-1" />
      </section>

      <form className="login-form tarjeta" onSubmit={enviar} noValidate>
        <div className="marca">
          <img src="/favicon.svg" alt="" className="marca-logo" />
          <div><div className="marca-nombre">SalonFlow</div><div className="marca-sub">Barbería y peluquería</div></div>
        </div>
        <div>
          <h2 className="marcador">Inicia sesión</h2>
          <p className="sub">Usa el correo con el que te registró el administrador.</p>
        </div>
        {general && <div className="alerta" role="alert">{general}</div>}
        <Campo etiqueta="Correo" error={errores.email}>
          <input type="email" autoComplete="username" placeholder="tu@correo.com" value={email} onChange={(e) => { setEmail(e.target.value); setErrores((x) => ({ ...x, email: '' })) }} autoFocus />
        </Campo>
        <Campo etiqueta="Contraseña" error={errores.password}>
          <input type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setErrores((x) => ({ ...x, password: '' })) }} />
        </Campo>
        <button className="btn login-entrar ancho" disabled={enviando}><Play aria-hidden />{enviando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}
