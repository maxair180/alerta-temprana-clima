#!/usr/bin/env python3
"""
============================================================================
CLIMASAFE RURAL - EMULADOR DE SENSORES FÍSICOS IoT (CLI)
============================================================================
Este script permite simular dispositivos de hardware físicos (ESP32 / Arduino)
transmitiendo telemetría en tiempo real hacia el API Gateway.

Uso:
    python sensor_simulator_cli.py --gateway http://localhost:8080
    python sensor_simulator_cli.py --sensor SENS-TEMP-01 --valor 42.5  # Simula calor extremo / incendio
    python sensor_simulator_cli.py --continuous --interval 6           # Transmisión continua cada 6s
"""

import sys
import time
import json
import random
import argparse
import datetime
import requests

SENSORES_DEFAULT = [
    {
        "codigo": "SENS-TEMP-01",
        "nombre": "Sensor Temperatura - Valle Central",
        "tipo": "Temperatura",
        "unidad": "°C",
        "base": 23.4,
        "min": 10.0,
        "max": 35.0,
        "key": "API-KEY-SENS-TEMP-01-2026"
    },
    {
        "codigo": "SENS-HUM-01",
        "nombre": "Sensor Humedad Relativa - Cultivos",
        "tipo": "Humedad",
        "unidad": "%",
        "base": 68.2,
        "min": 40.0,
        "max": 85.0,
        "key": "API-KEY-SENS-HUM-01-2026"
    },
    {
        "codigo": "SENS-WIND-01",
        "nombre": "Anemómetro - Cerro Las Minas",
        "tipo": "Viento",
        "unidad": "km/h",
        "base": 18.5,
        "min": 0.0,
        "max": 45.0,
        "key": "API-KEY-SENS-WIND-01-2026"
    },
    {
        "codigo": "SENS-RAIN-01",
        "nombre": "Pluviómetro - Cuenca Norte",
        "tipo": "Lluvia",
        "unidad": "mm",
        "base": 4.2,
        "min": 0.0,
        "max": 35.0,
        "key": "API-KEY-SENS-RAIN-01-2026"
    },
    {
        "codigo": "SENS-RIVR-01",
        "nombre": "Sensor Hidrométrico - Río Villalobos",
        "tipo": "NivelRio",
        "unidad": "m",
        "base": 2.3,
        "min": 1.0,
        "max": 4.5,
        "key": "API-KEY-SENS-RIVR-01-2026"
    }
]

def enviar_lectura(gateway_url: str, sensor: dict, valor: float):
    url = f"{gateway_url.rstrip('/')}/api/sensors/ingest"
    headers = {
        "Content-Type": "application/json",
        "X-Sensor-Key": sensor.get("key", "DEFAULT-KEY")
    }
    payload = {
        "codigoSensor": sensor["codigo"],
        "valor": round(valor, 2),
        "unidad": sensor["unidad"],
        "bateria": random.randint(90, 100),
        "ipDispositivo": f"192.168.1.{random.randint(101, 120)}",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

    try:
        t0 = time.time()
        res = requests.post(url, json=payload, headers=headers, timeout=5.0)
        ms = int((time.time() - t0) * 1000)

        if res.status_code == 200:
            data = res.json()
            nivel = data.get("nivelRiesgo", "Verde")
            icono = "🟢" if nivel == "Verde" else "🟡" if nivel == "Amarillo" else "🟠" if nivel == "Naranja" else "🔴"
            print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {icono} {sensor['codigo']} | Valor: {valor:.2f} {sensor['unidad']} | Nivel: {nivel} ({ms}ms)")
        else:
            print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] ❌ HTTP {res.status_code}: {res.text[:80]}")
    except requests.exceptions.ConnectionError:
        print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] ⚠️ No se pudo conectar a {gateway_url}. ¿El Gateway está levantado?")
    except Exception as e:
        print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] ❌ Error: {e}")

def main():
    parser = argparse.ArgumentParser(description="Emulador de Hardware IoT para ClimaSafe Rural")
    parser.add_argument("--gateway", default="http://localhost:8080", help="URL del API Gateway")
    parser.add_argument("--sensor", default=None, help="Código de sensor específico (ej. SENS-TEMP-01)")
    parser.add_argument("--valor", type=float, default=None, help="Valor forzado para enviar")
    parser.add_argument("--continuous", action="store_true", help="Enviar transmisiones continuas")
    parser.add_argument("--interval", type=int, default=6, help="Segundos entre envíos continuos")

    args = parser.parse_args()

    print("============================================================================")
    print("🛰️ CLIMASAFE RURAL - EMULADOR DE TELEMETRÍA DE SENSORES IoT")
    print(f"Destino: {args.gateway}")
    print("============================================================================")

    # Si se especificó un sensor y valor manual
    if args.sensor:
        s = next((x for x in SENSORES_DEFAULT if x["codigo"] == args.sensor), {
            "codigo": args.sensor, "unidad": "N/A", "key": "CUSTOM-KEY"
        })
        val = args.valor if args.valor is not None else 25.0
        enviar_lectura(args.gateway, s, val)
        return

    # Si es modo continuo
    if args.continuous:
        print(f"🚀 Iniciando transmisión continua de {len(SENSORES_DEFAULT)} sensores cada {args.interval}s (Ctrl+C para detener)...")
        valores_actuales = {s["codigo"]: s["base"] for s in SENSORES_DEFAULT}

        try:
            while True:
                for s in SENSORES_DEFAULT:
                    # Simular fluctuación física suave
                    delta = (random.random() - 0.48) * (1.2 if s["tipo"] == "Temperatura" else 2.5)
                    nuevo_val = valores_actuales[s["codigo"]] + delta

                    # Límites físicos realistas
                    if s["tipo"] == "Temperatura": nuevo_val = max(10.0, min(38.0, nuevo_val))
                    if s["tipo"] == "Humedad": nuevo_val = max(35.0, min(95.0, nuevo_val))
                    if s["tipo"] == "Viento": nuevo_val = max(0.0, min(65.0, nuevo_val))
                    if s["tipo"] == "Lluvia": nuevo_val = max(0.0, min(45.0, nuevo_val))
                    if s["tipo"] == "NivelRio": nuevo_val = max(1.0, min(4.8, nuevo_val))

                    valores_actuales[s["codigo"]] = nuevo_val
                    enviar_lectura(args.gateway, s, nuevo_val)
                    time.sleep(0.4)

                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\n⏹️ Emulación finalizada por el usuario.")
    else:
        # Envío único de prueba de todos los sensores
        print("Enviando muestra inicial de prueba...")
        for s in SENSORES_DEFAULT:
            enviar_lectura(args.gateway, s, s["base"])
            time.sleep(0.3)
        print("\nPara transmisión en tiempo real continua usa: python sensor_simulator_cli.py --continuous")

if __name__ == "__main__":
    main()
