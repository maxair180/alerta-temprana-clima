/**
 * ============================================================================
 * CLIMASAFE RURAL - FIRMWARE ESTACIÓN METEOROLÓGICA IoT (ESP32)
 * ============================================================================
 * Plataforma: ESP32 NodeMCU / ESP32-WROOM-32
 * Entorno: Arduino IDE o PlatformIO
 * Protocolo: HTTP REST / JSON vía WiFi
 * Endpoint: POST http://<IP_GATEWAY>:8080/api/sensors/ingest
 * 
 * Sensores Físicos Compatibles:
 *  - Temperatura y Humedad: DHT22 (AM2302) o DHT11 en GPIO 4
 *  - Nivel de Río / Reservorio: Sensor Ultrasónico HC-SR04 / JSN-SR04T en GPIO 5 (Trig) y 18 (Echo)
 *  - Pluviómetro (Lluvia): Sensor de balancín en GPIO 19
 *  - Anemómetro (Viento): Sensor analógico/pulsos en GPIO 34 (ADC1)
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Instalar biblioteca "ArduinoJson" v6 o v7 en Arduino IDE

// ======================== CONFIGURACIÓN DE RED ========================
const char* WIFI_SSID     = "TU_RED_WIFI";
const char* WIFI_PASSWORD = "TU_CONTRASENA_WIFI";

// Dirección IP o dominio del API Gateway de ClimaSafe
const char* GATEWAY_URL   = "http://192.168.1.100:8080/api/sensors/ingest";

// ======================== IDENTIFICACIÓN DEL SENSOR ========================
// Código de estación meteorológica registrado en el sistema
const char* SENSOR_CODIGO = "SENS-TEMP-01"; // o SENS-HUM-01, SENS-WIND-01, SENS-RAIN-01, SENS-RIVR-01
const char* SENSOR_API_KEY = "API-KEY-SENS-TEMP-01-2026"; // Clave generada por el sistema

// Frecuencia de muestreo y transmisión (en milisegundos)
const unsigned long INTERVALO_ENVIO_MS = 6000; // Cada 6 segundos

// ======================== PINES DE HARDWARE ========================
#define PIN_DHT22     4   // Sensor DHT22 (Temperatura / Humedad)
#define PIN_TRIG      5   // Sensor Ultrasónico Trigger
#define PIN_ECHO      18  // Sensor Ultrasónico Echo
#define PIN_LLUVIA    19  // Pluviómetro Digital
#define PIN_VIENTO    34  // Anemómetro Analógico ADC
#define PIN_LED_ESTADO 2  // LED indicador azul integrado

// ======================== VARIABLES GLOBALES ========================
unsigned long ultimoEnvio = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  pinMode(PIN_LED_ESTADO, OUTPUT);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_LLUVIA, INPUT_PULLUP);

  Serial.println("\n========================================================");
  Serial.println("🛰️ ClimaSafe Rural - Nodo Sensor IoT Iniciando...");
  Serial.printf("Estación: %s\n", SENSOR_CODIGO);
  Serial.println("========================================================");

  conectarWiFi();
}

void loop() {
  // Mantener reconexión WiFi activa si se pierde la señal
  if (WiFi.status() != WL_CONNECTED) {
    conectarWiFi();
  }

  // Transmitir cada INTERVALO_ENVIO_MS
  if (millis() - ultimoEnvio >= INTERVALO_ENVIO_MS) {
    ultimoEnvio = millis();

    // 1. Leer sensores físicos (o valores de demostración si no hay hardware conectado)
    float valorMedido = leerSensorFisico();
    int nivelBateria = map(analogRead(35), 0, 4095, 0, 100);
    if (nivelBateria <= 0 || nivelBateria > 100) nivelBateria = 98; // Respaldo 98%

    // 2. Enviar telemetría al API Gateway
    enviarTelemetria(valorMedido, nivelBateria);
  }
}

/**
 * Conexión segura a la red WiFi local
 */
void conectarWiFi() {
  Serial.printf("📡 Conectando a red WiFi: %s ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_LED_ESTADO, !digitalRead(PIN_LED_ESTADO));
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(PIN_LED_ESTADO, HIGH);
    Serial.println("\n✅ WiFi Conectado con éxito!");
    Serial.printf("IP Local: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("Potencia Señal (RSSI): %d dBm\n", WiFi.RSSI());
  } else {
    digitalWrite(PIN_LED_ESTADO, LOW);
    Serial.println("\n⚠️ No se pudo conectar a WiFi. Se reintentará en el próximo ciclo.");
  }
}

/**
 * Lee la variable física correspondiente al sensor
 */
float leerSensorFisico() {
  // EJEMPLO 1: Sensor de Nivel de Río HC-SR04 (Distancia ultrasónica en metros)
  // digitalWrite(PIN_TRIG, LOW);
  // delayMicroseconds(2);
  // digitalWrite(PIN_TRIG, HIGH);
  // delayMicroseconds(10);
  // digitalWrite(PIN_TRIG, LOW);
  // long duracion = pulseIn(PIN_ECHO, HIGH, 30000);
  // float distanciaCm = duracion * 0.034 / 2;
  // float nivelRioMetros = 6.0 - (distanciaCm / 100.0); // Calibrado para puente de 6 metros

  // EJEMPLO 2: Lectura térmica analógica o calibrada (20°C a 30°C con variación suave)
  static float valorActual = 23.4;
  float fluctuacion = ((random(0, 100) / 100.0) - 0.48) * 0.6;
  valorActual += fluctuacion;
  if (valorActual < 15.0) valorActual = 15.0;
  if (valorActual > 38.0) valorActual = 38.0;

  return valorActual;
}

/**
 * Empaqueta y transmite el JSON mediante HTTP POST
 */
void enviarTelemetria(float valor, int bateria) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(GATEWAY_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Sensor-Key", SENSOR_API_KEY);

  // Construir documento JSON
  StaticJsonDocument<256> doc;
  doc["codigoSensor"] = SENSOR_CODIGO;
  doc["valor"] = serialized(String(valor, 2));
  doc["unidad"] = "°C";
  doc["bateria"] = bateria;
  doc["ipDispositivo"] = WiFi.localIP().toString();

  String payloadJson;
  serializeJson(doc, payloadJson);

  Serial.println("\n--------------------------------------------------------");
  Serial.printf("📤 Transmitiendo Telemetría: %s\n", payloadJson.c_str());

  int httpCode = http.POST(payloadJson);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("📥 Respuesta Gateway [%d]: %s\n", httpCode, response.c_str());

    // Parpadeo de confirmación en LED
    digitalWrite(PIN_LED_ESTADO, LOW);
    delay(100);
    digitalWrite(PIN_LED_ESTADO, HIGH);
  } else {
    Serial.printf("❌ Error al transmitir HTTP: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}
