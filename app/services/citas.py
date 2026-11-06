"""Reglas de negocio de la agenda."""
from datetime import date, time, timedelta

from sqlalchemy.orm import Session

from app.core.database import ahora, hoy
from app.core.errors import Conflicto, NoEncontrado, Prohibido, ReglaNegocio
from app.core.security import ESTILISTA
from app.models import Cita, Cliente, Estilista, Servicio
from app.repositories import citas as repo

APERTURA, CIERRE = time(9, 0), time(18, 0)   # última cita empieza a las 18:00
INTERVALO_MIN = 15
DIAS_MAX_ANTICIPACION = 90

# Flujo de estados permitido
TRANSICIONES = {
    "Pendiente": {"Confirmada", "Atendida", "Cancelada"},
    "Confirmada": {"Atendida", "Cancelada"},
    "Atendida": set(),
    "Cancelada": set(),
}


def a_dto(c: Cita) -> dict:
    return {
        "id": c.id, "fecha": c.fecha, "hora": c.hora, "estado": c.estado, "precio": c.precio,
        "cliente_id": c.cliente_id, "cliente": c.cliente.nombre,
        "servicio_id": c.servicio_id, "servicio": c.servicio.nombre,
        "estilista_id": c.estilista_id, "estilista": c.estilista.nombre,
    }


def listar(db: Session, usuario, fecha: date | None, estilista_id: int | None, estado: str | None) -> list[dict]:
    if usuario.rol == ESTILISTA:          # un estilista solo ve su propia agenda
        estilista_id = usuario.estilista_id
    return [a_dto(c) for c in repo.listar(db, fecha or hoy(), estilista_id, estado)]


def disponibilidad(db: Session, fecha: date, estilista_id: int) -> dict:
    if db.get(Estilista, estilista_id) is None:
        raise NoEncontrado("El estilista no existe.")
    ocupadas = repo.horas_ocupadas(db, estilista_id, fecha)
    momento = ahora()
    libres = []
    for h in range(APERTURA.hour, CIERRE.hour + 1):
        franja = time(h, 0)
        if franja in ocupadas:
            continue
        if fecha == momento.date() and franja <= momento.time():
            continue
        libres.append(franja.strftime("%H:%M"))
    return {"fecha": fecha, "estilista_id": estilista_id, "horas_libres": libres}


def _validar_horario(fecha: date, hora: time) -> list[dict]:
    errores = []
    hoy_ = hoy()
    if fecha < hoy_:
        errores.append({"campo": "fecha", "mensaje": "No se pueden agendar citas en fechas pasadas."})
    elif fecha > hoy_ + timedelta(days=DIAS_MAX_ANTICIPACION):
        errores.append({"campo": "fecha", "mensaje": f"Solo se agenda con máximo {DIAS_MAX_ANTICIPACION} días de anticipación."})
    if not (APERTURA <= hora <= CIERRE):
        errores.append({"campo": "hora", "mensaje": "El horario de atención es de 9:00 a. m. a 6:00 p. m."})
    elif hora.minute % INTERVALO_MIN or hora.second:
        errores.append({"campo": "hora", "mensaje": "La hora debe ir en intervalos de 15 minutos."})
    elif fecha == hoy_ and hora <= ahora().time():
        errores.append({"campo": "hora", "mensaje": "Esa hora ya pasó."})
    return errores


def crear(db: Session, datos) -> dict:
    errores = _validar_horario(datos.fecha, datos.hora)

    cliente = db.get(Cliente, datos.cliente_id)
    servicio = db.get(Servicio, datos.servicio_id)
    estilista = db.get(Estilista, datos.estilista_id)
    if cliente is None:
        errores.append({"campo": "cliente_id", "mensaje": "El cliente no existe."})
    if servicio is None or not servicio.activo:
        errores.append({"campo": "servicio_id", "mensaje": "El servicio no existe o no está activo."})
    if estilista is None or not estilista.activo:
        errores.append({"campo": "estilista_id", "mensaje": "El estilista no existe o no está activo."})
    if errores:
        raise ReglaNegocio("No se pudo agendar la cita.", errores)

    # Regla "0 citas cruzadas" (el índice único de la BD también la garantiza)
    if repo.hay_conflicto(db, estilista.id, datos.fecha, datos.hora):
        raise Conflicto(f"{estilista.nombre} ya tiene una cita a las {datos.hora.strftime('%H:%M')} ese día.",
                        [{"campo": "hora", "mensaje": "Horario ocupado. Elige otra hora."}])

    cita = repo.crear(db, fecha=datos.fecha, hora=datos.hora, cliente_id=cliente.id,
                      servicio_id=servicio.id, estilista_id=estilista.id, precio=servicio.precio)
    db.commit()
    return a_dto(cita)


def cambiar_estado(db: Session, cita_id: int, nuevo: str, usuario) -> dict:
    cita = repo.obtener(db, cita_id)
    if cita is None:
        raise NoEncontrado("La cita no existe.")
    if usuario.rol == ESTILISTA:
        if cita.estilista_id != usuario.estilista_id:
            raise Prohibido("Solo puedes gestionar tus propias citas.")
        if nuevo == "Cancelada":
            raise Prohibido("Para cancelar una cita comunícate con recepción.")
    if nuevo == cita.estado:
        raise ReglaNegocio(f"La cita ya está {nuevo.lower()}.")
    if nuevo not in TRANSICIONES[cita.estado]:
        raise ReglaNegocio(f"No se puede pasar una cita de {cita.estado} a {nuevo}.")
    if nuevo == "Atendida" and cita.fecha > hoy():
        raise ReglaNegocio("No se puede marcar como atendida una cita futura.")
    cita.estado = nuevo
    db.commit()
    return a_dto(cita)
