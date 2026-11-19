"""Entrena la red neuronal de clientes en riesgo de no volver (RF-14).

Sigue la "Guía paso a paso: Cómo crear un servicio inteligente con TensorFlow" (UMB):
datos sintéticos -> normalización -> red densa pequeña -> evaluación -> archivo .keras.

Uso:
    python entrenar_modelo.py

Genera:
    modelo_riesgo.keras  modelo entrenado que carga api.py
    metricas.json        métricas sobre el conjunto de prueba y comparación con la línea base

IMPORTANTE: los datos son sintéticos. El modelo sirve para demostrar el flujo
técnico y la integración; debe reentrenarse con el historial real del salón
antes de usarlo para decisiones reales.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import tensorflow as tf

from preprocesamiento import UMBRAL_RIESGO, VERSION_MODELO, normalizar, regla_base

CARPETA = Path(__file__).resolve().parent
SEMILLA = 42
N_CLIENTES = 3000
RUIDO_ETIQUETAS = 0.08  # 8 % de etiquetas cambiadas al azar (sección 18.2)


def generar_datos(n: int, rng: np.random.Generator):
    """Clientes ficticios con valores realistas para un salón de barrio."""
    intervalo = rng.uniform(7, 90, n)                       # viene cada 1 a 13 semanas
    num_visitas = rng.integers(2, 61, n).astype(np.float32)  # al menos dos visitas
    gasto = rng.uniform(12_000, 180_000, n)                 # corte, color, barba, etc.

    # La mitad de los clientes va "al día" y la otra mitad lleva más tiempo sin venir.
    al_dia = rng.random(n) < 0.5
    proporcion = np.where(al_dia, rng.uniform(0.1, 1.8, n), rng.uniform(1.2, 5.0, n))
    dias = np.clip(intervalo * proporcion, 0, 400)

    # Etiqueta de la guía: regla + una parte de etiquetas cambiadas al azar,
    # para que el modelo no se limite a copiar la regla.
    y = regla_base(dias, intervalo)
    cambiar = rng.random(n) < RUIDO_ETIQUETAS
    y = np.where(cambiar, 1 - y, y).astype(np.float32)

    X = np.column_stack([dias, intervalo, num_visitas, gasto]).astype(np.float32)
    return X, y


def dividir(X, y, rng):
    """70 % entrenamiento, 15 % validación, 15 % prueba."""
    idx = rng.permutation(len(X))
    n_ent, n_val = int(0.70 * len(X)), int(0.15 * len(X))
    p_ent, p_val, p_pru = idx[:n_ent], idx[n_ent:n_ent + n_val], idx[n_ent + n_val:]
    return (X[p_ent], y[p_ent]), (X[p_val], y[p_val]), (X[p_pru], y[p_pru])


def metricas(y_real, y_pred) -> dict:
    y_real, y_pred = np.asarray(y_real).astype(int), np.asarray(y_pred).astype(int)
    vp = int(((y_pred == 1) & (y_real == 1)).sum())
    fp = int(((y_pred == 1) & (y_real == 0)).sum())
    fn = int(((y_pred == 0) & (y_real == 1)).sum())
    vn = int(((y_pred == 0) & (y_real == 0)).sum())
    precision = vp / (vp + fp) if vp + fp else 0.0
    recall = vp / (vp + fn) if vp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {
        "exactitud": round((vp + vn) / len(y_real), 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "matriz_confusion": {"vp": vp, "fp": fp, "fn": fn, "vn": vn},
    }


def main():
    rng = np.random.default_rng(SEMILLA)
    tf.keras.utils.set_random_seed(SEMILLA)

    X, y = generar_datos(N_CLIENTES, rng)
    (X_ent, y_ent), (X_val, y_val), (X_pru, y_pru) = dividir(X, y, rng)

    # Red de la guía: 4 entradas -> 8 ReLU -> 4 ReLU -> 1 sigmoide.
    modelo = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(4,)),
        tf.keras.layers.Dense(8, activation="relu"),
        tf.keras.layers.Dense(4, activation="relu"),
        tf.keras.layers.Dense(1, activation="sigmoid"),
    ])
    modelo.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
    modelo.fit(
        normalizar(X_ent), y_ent,
        validation_data=(normalizar(X_val), y_val),
        epochs=150, batch_size=32, verbose=0,
        callbacks=[tf.keras.callbacks.EarlyStopping(patience=15, restore_best_weights=True)],
    )

    # Evaluación sobre datos que el modelo no vio al entrenar.
    prob = modelo.predict(normalizar(X_pru), verbose=0).ravel()
    pred_modelo = (prob >= UMBRAL_RIESGO).astype(int)
    pred_regla = regla_base(X_pru[:, 0], X_pru[:, 1])

    resultado = {
        "version_modelo": VERSION_MODELO,
        "fecha_entrenamiento": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "datos": "sintéticos",
        "tamano": {"entrenamiento": len(X_ent), "validacion": len(X_val), "prueba": len(X_pru)},
        "umbral": UMBRAL_RIESGO,
        "modelo": metricas(y_pru, pred_modelo),
        "linea_base_regla_fija": metricas(y_pru, pred_regla),
    }

    modelo.save(CARPETA / "modelo_riesgo.keras")
    (CARPETA / "metricas.json").write_text(json.dumps(resultado, indent=2, ensure_ascii=False), encoding="utf-8")

    m, b = resultado["modelo"], resultado["linea_base_regla_fija"]
    print("Modelo entrenado y guardado en modelo_riesgo.keras")
    print(f"Conjunto de prueba: {len(X_pru)} clientes")
    print(f"{'':12}{'Modelo':>10}{'Regla fija':>12}")
    for k in ("exactitud", "precision", "recall", "f1"):
        print(f"{k:12}{m[k]:>10.3f}{b[k]:>12.3f}")
    print("Matriz de confusión del modelo:", m["matriz_confusion"])


if __name__ == "__main__":
    main()
