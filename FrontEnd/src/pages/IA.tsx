import { BrainCircuit, PhoneCall, UserRoundX, Users } from 'lucide-react'
import ClientesEnRiesgo, { useRiesgo } from '../components/ClientesEnRiesgo'
import { Encabezado, Franja, Stat } from '../components/ui'
import { fechaCorta } from '../utils/format'

/** Apartado de inteligencia artificial: todo lo que calcula el servicio de IA (RF-14). Solo administrador. */
export default function IA() {
  const r = useRiesgo()
  const d = r.lista.datos
  const contactados = d?.clientes.filter((c) => c.contactado).length ?? 0

  return (
    <>
      <Encabezado titulo="Inteligencia artificial"
        subtitulo="Una red neuronal estima qué clientes podrían no volver, según cada cuánto venían y cuánto llevan sin venir." />

      {d && (
        <Franja>
          <Stat icono={<UserRoundX />} etiqueta="En riesgo" valor={d.en_riesgo} alerta={d.en_riesgo > 0}
            nota={`de ${d.evaluados} clientes evaluados`} />
          <Stat icono={<PhoneCall />} etiqueta="Por contactar" valor={d.clientes.length - contactados} nota={`${contactados} ya contactados`} />
          <Stat icono={<Users />} etiqueta="Clientes evaluados" valor={d.evaluados} nota="Con dos visitas o más y datos autorizados" />
          <Stat icono={<BrainCircuit />} etiqueta="Modelo" valor={d.version_modelo ? `v${d.version_modelo}` : '—'}
            nota={d.fecha_calculo ? `Calculado el ${fechaCorta(d.fecha_calculo)}${d.actualizada ? '' : ' (desactualizado)'}` : 'Aún sin calcular'} />
        </Franja>
      )}

      <ClientesEnRiesgo r={r} />
    </>
  )
}
