#!/usr/bin/env python3
"""
============================================================================
CLIMASAFE RURAL - PUENTE SERIAL USB (ARDUINO UNO R3 -> API BACKEND)
============================================================================
Este script escucha las lecturas enviadas por el Arduino UNO R3 a través del
cable USB (puerto Serial COM) y las retransmite en tiempo real al API Gateway
o al backend de ClimaSafe.

Requisitos:
    pip install pyserial requests

Uso:
    python iot-hardware/serial_bridge.py
    python iot-hardware/serial_bridge.py --port COM3
    python iot-hardware/serial_bridge.py --api http://localhost:5288
============================================================================
"""

import sys
import time
import json
import argparse
import requests

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    print("\n❌ Error: La librería 'pyserial' no está instalada.")
    print("👉 Instálala ejecutando:  pip install pyserial requests\n")
    sys.exit(1)


def detectar_puerto_com():
    """Detecta automáticamente el puerto COM donde está conectado el Arduino"""
    puertos = list(serial.tools.list_ports.comports())
    if not puertos:
        return None

    # Buscar puertos comunes de Arduino
    for p in puertos:
        desc = p.description.lower()
        if "arduino" in desc or "ch340" in desc or "usb-serial" in desc or "cp210" in desc:
            return p.device

    # Si hay al menos un puerto serie detectado, retornar el primero
    return puertos[0].device


def listar_puertos():
    puertos = list(serial.tools.list_ports.comports())
    if not puertos:
        print("⚠️ No se encontraron puertos COM activos.")
    else:
        print("Puertos disponibles:")
        for p in puertos:
            print(f"  - {p.device}: {p.description}")


def enviar_a_api(gateway_url, backend_direct_url, codigo, sensor_id, valor, unidad, key):
    """Intenta enviar primero al Gateway, o directamente a ClimaApi"""
    # 1. Intentar Gateway (/api/sensors/ingest)
    payload_gateway = {
        "codigoSensor": codigo,
        "valor": round(float(valor), 2),
        "unidad": unidad,
        "bateria": 100
    }
    headers = {
        "Content-Type": "application/json",
        "X-Sensor-Key": key
    }
    
    enviado = False
    try:
        url_gw = f"{gateway_url.rstrip('/')}/api/sensors/ingest"
        resp = requests.post(url_gw, json=payload_gateway, headers=headers, timeout=2)
        if resp.status_code in [200, 201]:
            enviado = True
    except Exception:
        pass

    # 2. Si el Gateway no respondió, enviar directo a ClimaApi (/api/lecturas)
    if not enviado and backend_direct_url:
        payload_backend = {
            "sensorId": sensor_id,
            "valor": round(float(valor), 2),
            "unidad": unidad,
            "estadoSensor": True
        }
        try:
            url_be = f"{backend_direct_url.rstrip('/')}/api/lecturas"
            resp = requests.post(url_be, json=payload_backend, timeout=2)
            if resp.status_code in [200, 201]:
                enviado = True
        except Exception:
            pass

    return enviado


def main():
    parser = argparse.ArgumentParser(description="Puente Serial Arduino UNO para ClimaSafe Rural")
    parser.add_argument("--port", type=str, default="", help="Puerto Serial COM (ej. COM3, COM4, /dev/ttyACM0)")
    parser.add_argument("--baud", type=int, default=115200, help="Velocidad en baudios (default: 115200)")
    parser.add_argument("--gateway", type=str, default="http://localhost:8080", help="URL del API Gateway")
    parser.add_argument("--backend", type=str, default="http://localhost:5288", help="URL directa del backend ClimaApi")
    args = parser.parse_args()

    puerto = args.port
    if not puerto:
        puerto = detectar_puerto_com()
        if not puerto:
            print("❌ No se encontró ningún Arduino conectado.")
            listar_puertos()
            print("\nPor favor especifica el puerto manualmente con: --port COMx")
            sys.exit(1)

    print("\n========================================================")
    print("🛰️  CLIMASAFE RURAL - PUENTE SERIAL ARDUINO UNO R3")
    print(f"🔌 Conectando a puerto: {puerto} a {args.baud} baudios")
    print(f"🎯 Destinos API: Gateway ({args.gateway}) / ClimaApi ({args.backend})")
    print("========================================================\n")

    try:
        arduino = serial.Serial(puerto, args.baud, timeout=2)
        time.sleep(2)  # Dar tiempo al Arduino para reiniciarse tras conectar USB
        print("✅ Conexión serial establecida. Escuchando sensores...\n")
    except Exception as e:
        print(f"❌ Error al abrir el puerto {puerto}: {e}")
        listar_puertos()
        sys.exit(1)

    while True:
        try:
            linea_bytes = arduino.readline()
            if not linea_bytes:
                continue

            linea = linea_bytes.decode('utf-8', errors='ignore').strip()
            if not linea:
                continue

            # Verificar si es una línea JSON válida
            if linea.startswith('{') and linea.endswith('}'):
                try:
                    data = json.loads(linea)
                except json.JSONDecodeError:
                    continue

                if "temperatura" in data and "humedad" in data:
                    temp = data.get("temperatura", 0.0)
                    hum = data.get("humedad", 0.0)
                    rio = data.get("nivel_rio", 0.0)
                    dist = data.get("distancia_cm", 0.0)

                    timestamp = time.strftime("%H:%M:%S")
                    print(f"[{timestamp}] 📥 Leído de Arduino -> Temp: {temp}°C | Hum: {hum}% | Río: {rio}m (Eco: {dist}cm)")

                    # 1. Enviar Temperatura (Sensor 1)
                    ok_temp = enviar_a_api(args.gateway, args.backend, "SENS-TEMP-01", 1, temp, "°C", "API-KEY-SENS-TEMP-01-2026")

                    # 2. Enviar Humedad (Sensor 2)
                    ok_hum = enviar_a_api(args.gateway, args.backend, "SENS-HUM-01", 2, hum, "%", "API-KEY-SENS-HUM-01-2026")

                    # 3. Enviar Nivel de Río (Sensor 5)
                    ok_rio = enviar_a_api(args.gateway, args.backend, "SENS-RIO-01", 5, rio, "m", "API-KEY-SENS-RIVR-01-2026")

                    if ok_temp or ok_hum or ok_rio:
                        print("   └── 🚀 Telemetría transmitida a la API con éxito.")
                    else:
                        print("   └── ⚠️ No se pudo contactar con la API (revisa si el backend o Docker están encendidos).")

                elif "estado" in data:
                    print(f"ℹ️ Info de Arduino: {linea}")

            else:
                # Texto de depuración general
                print(f"[Serial debug]: {linea}")

        except KeyboardInterrupt:
            print("\n👋 Deteniendo el puente serial...")
            break
        except Exception as e:
            print(f"⚠️ Error en lectura serial: {e}")
            time.sleep(1)

    arduino.close()


if __name__ == "__main__":
    main()

