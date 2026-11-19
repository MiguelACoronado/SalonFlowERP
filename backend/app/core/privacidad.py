"""Aviso de privacidad (Ley 1581 de 2012, art. 12) que se le muestra al cliente antes de registrarlo.

La política completa está en docs/politica_tratamiento_datos.md. Si cambia el texto del aviso,
hay que subir VERSION_POLITICA: cada cliente guarda la versión que aceptó (prueba de la autorización).
"""
from app.core.config import get_settings

VERSION_POLITICA = "1.0"


def aviso_privacidad() -> dict:
    s = get_settings()
    return {
        "version": VERSION_POLITICA,
        "responsable": s.responsable_nombre,
        "contacto": s.responsable_contacto,
        "datos": ["nombre", "teléfono", "servicio frecuente", "historial de citas y servicios"],
        "finalidades": [
            "Agendar citas y recordarlas.",
            "Llevar el historial de servicios del cliente.",
            "Analizar la frecuencia de visitas con un modelo de IA propio para sugerir a quién "
            "contactar con fines de fidelización. El modelo solo recibe indicadores numéricos, "
            "nunca nombre ni teléfono, y no toma decisiones: la decisión es del salón.",
        ],
        "almacenamiento": ("Los datos se guardan en servidores de proveedores de nube que pueden estar "
                           "fuera de Colombia, con acceso restringido por usuario y rol."),
        "derechos": ("Conocer, actualizar, rectificar y pedir la supresión de sus datos, revocar esta "
                     "autorización, pedir prueba de ella y presentar quejas ante la Superintendencia de "
                     "Industria y Comercio (art. 8)."),
        "texto": (f"Autorizo a {s.responsable_nombre} a tratar mis datos personales (nombre, teléfono e "
                  "historial de servicios) para agendar citas, llevar mi historial y analizar la frecuencia "
                  "de mis visitas con fines de fidelización, incluido su almacenamiento en servidores fuera "
                  "de Colombia, según su política de tratamiento de datos. Conozco mis derechos a conocer, "
                  "actualizar, rectificar y suprimir mis datos y a revocar esta autorización escribiendo a "
                  f"{s.responsable_contacto}."),
    }
