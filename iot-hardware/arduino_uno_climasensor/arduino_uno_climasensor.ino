/**
 * ============================================================================
 * CLIMASAFE RURAL - FIRMWARE ESTACIÓN METEOROLÓGICA IoT
 * ============================================================================
 * Plataforma: Arduino UNO R3 (ATmega328P)
 * Sensores Físicos Conectados:
 *   1. DHT11: Sensor de Temperatura (°C) y Humedad Relativa (%)
 *      - VCC -> 5V
 *      - GND -> GND
 *      - DATA -> Pin Digital 2
 * 
 *   2. HC-SR04: Sensor Ultrasónico de Nivel de Río (Metros)
 *      - VCC -> 5V
 *      - GND -> GND
 *      - TRIG -> Pin Digital 9
 *      - ECHO -> Pin Digital 8
 * 
 * Comunicación:
 *   - Transmisión de paquetes JSON cada 5 segundos a través de USB Serial (115200 baudios)
 *   - El script en la PC (serial_bridge.py) lee este puerto y envía la telemetría a la API.
 * ============================================================================
 */

#include <DHT.h>

// ======================== ASIGNACIÓN DE PINES ========================
#define PIN_DHT        2    // Pin de datos del sensor DHT11
#define PIN_TRIG       9    // Pin Trigger del HC-SR04
#define PIN_ECHO       8    // Pin Echo del HC-SR04
#define PIN_LED_BUILDIN 13  // LED integrado en placa (parpadea al transmitir)

// Tipo de sensor DHT
#define DHTTYPE DHT11

DHT dht(PIN_DHT, DHTTYPE);

// ======================== CONFIGURACIÓN Y CALIBRACIÓN ========================
// Altura total donde está instalado el sensor sobre el río o cuenca (en metros)
// Ejemplo: si el sensor está en un puente a 3.50 metros del fondo seco:
const float ALTURA_INSTALACION_RIO_M = 3.50; 

// Intervalo de lectura y transmisión (en milisegundos)
const unsigned long INTERVALO_ENVIO_MS = 500; // Cada .5 segundos

unsigned long ultimoEnvio = 0;

void setup() {
  // Inicializar comunicación serial por cable USB
  Serial.begin(115200);
  
  // Configurar pines del sensor ultrasónico
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  
  // Configurar LED de estado
  pinMode(PIN_LED_BUILDIN, OUTPUT);

  // Inicializar sensor de temperatura y humedad
  dht.begin();

  delay(1000);
  Serial.println(F("{\"estado\":\"INICIADO\",\"dispositivo\":\"Arduino UNO R3\",\"sensores\":[\"DHT11\",\"HC-SR04\"]}"));
}

void loop() {
  unsigned long tiempoActual = millis();

  if (tiempoActual - ultimoEnvio >= INTERVALO_ENVIO_MS) {
    ultimoEnvio = tiempoActual;

    // Encender LED mientras toma la lectura
    digitalWrite(PIN_LED_BUILDIN, HIGH);

    // 1. Lectura del DHT11 (Temperatura y Humedad)
    float humedad = dht.readHumidity();
    float temperatura = dht.readTemperature(); // Celsius

    // 2. Lectura del HC-SR04 (Nivel de río)
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);

    // Medir tiempo de rebote del eco (timeout de 30ms para un máx de ~5 metros)
    long duracionMicrosegundos = pulseIn(PIN_ECHO, HIGH, 30000);

    float distanciaCm = 0.0;
    float nivelRioMetros = 0.0;

    if (duracionMicrosegundos > 0) {
      // Velocidad del sonido ~343 m/s = 0.0343 cm/us (ida y vuelta / 2)
      distanciaCm = (duracionMicrosegundos * 0.0343) / 2.0;

      // Nivel de agua = Altura instalación - distancia detectada al agua
      nivelRioMetros = ALTURA_INSTALACION_RIO_M - (distanciaCm / 100.0);
      if (nivelRioMetros < 0.0) {
        nivelRioMetros = 0.0;
      }
    }

    // Validación por si el DHT11 se desconectó
    bool dhtOk = true;
    if (isnan(temperatura) || isnan(humedad)) {
      dhtOk = false;
      temperatura = 0.0;
      humedad = 0.0;
    }

    // 3. Imprimir resultado estructurado en JSON por Serial USB
    Serial.print(F("{\"valido\":"));
    Serial.print(dhtOk ? F("true") : F("false"));
    Serial.print(F(",\"temperatura\":"));
    Serial.print(temperatura, 1);
    Serial.print(F(",\"humedad\":"));
    Serial.print(humedad, 1);
    Serial.print(F(",\"distancia_cm\":"));
    Serial.print(distanciaCm, 1);
    Serial.print(F(",\"nivel_rio\":"));
    Serial.print(nivelRioMetros, 2);
    Serial.println(F("}"));

    // Apagar LED de estado
    digitalWrite(PIN_LED_BUILDIN, LOW);
  }
}
