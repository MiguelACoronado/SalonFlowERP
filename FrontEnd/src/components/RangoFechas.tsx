import { hoyISO } from '../utils/format'

const ATAJOS = [7, 30, 90]

/** Selector de rango de fechas con atajos de 7, 30 y 90 días. */
export default function RangoFechas({ desde, hasta, onCambio }: { desde: string; hasta: string; onCambio: (d: string, h: string) => void }) {
  const activo = (d: number) => hasta === hoyISO() && desde === hoyISO(-(d - 1))
  return (
    <div className="rango">
      <div className="chips" role="group" aria-label="Periodo">
        {ATAJOS.map((d) => <button key={d} className="chip" aria-pressed={activo(d)} onClick={() => onCambio(hoyISO(-(d - 1)), hoyISO())}>Últimos {d} días</button>)}
      </div>
      <label className="inline">Desde <input type="date" value={desde} max={hoyISO()} onChange={(e) => e.target.value && onCambio(e.target.value, hasta)} /></label>
      <label className="inline">hasta <input type="date" value={hasta} max={hoyISO()} onChange={(e) => e.target.value && onCambio(desde, e.target.value)} /></label>
      {desde > hasta && <span className="campo-msg">La fecha inicial no puede ser posterior a la final.</span>}
    </div>
  )
}
