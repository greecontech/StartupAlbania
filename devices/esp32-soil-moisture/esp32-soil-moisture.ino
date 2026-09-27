/*
  Greecon Platform — soil moisture pilot station (ESP32)

  Every SLEEP_MINUTES the station wakes up, reads its sensors, sends the
  readings to the Greecon Platform ingestion API and goes back to deep sleep.

  Metrics sent (created automatically on the platform on first upload):
    soil_moisture_1 / soil_moisture_2   %      (0 = dry air, 100 = water)
    soil_moisture_1_raw / _2_raw        raw ADC value, used for calibration
    soil_temp                           °C     (DS18B20)
    air_temp / air_humidity             °C / % (SHT31, optional)
    wifi_rssi                           dBm    (signal strength, for diagnostics)

  Libraries (Arduino Library Manager): OneWire, DallasTemperature, Adafruit SHT31 Library.
  Board: "ESP32 Dev Module" (esp32 by Espressif Systems).
*/
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_SHT31.h>
#include "config.h"

const int PIN_SOIL_1 = 34;   // ADC1 pins only: ADC2 does not work while Wi-Fi is on
const int PIN_SOIL_2 = 35;
const int PIN_ONEWIRE = 4;
const int PIN_SENSOR_POWER = 25;  // powers the sensors only while measuring (saves energy, slows corrosion)

OneWire oneWire(PIN_ONEWIRE);
DallasTemperature soilTemp(&oneWire);
Adafruit_SHT31 sht31;

String payload;
int readingCount = 0;

void addReading(const char* metric, float value, const char* unit, const char* name) {
  if (isnan(value)) return;
  char item[160];
  snprintf(item, sizeof(item), "%s{\"metric\":\"%s\",\"value\":%.2f,\"unit\":\"%s\",\"name\":\"%s\"}",
           readingCount ? "," : "", metric, value, unit, name);
  payload += item;
  readingCount++;
}

int readRawAveraged(int pin) {
  long sum = 0;
  for (int i = 0; i < 16; i++) { sum += analogRead(pin); delay(10); }
  return sum / 16;
}

float toPercent(int raw, int dry, int wet) {
  float pct = 100.0f * (float)(dry - raw) / (float)(dry - wet);
  return constrain(pct, 0.0f, 100.0f);
}

void readSensors() {
  pinMode(PIN_SENSOR_POWER, OUTPUT);
  digitalWrite(PIN_SENSOR_POWER, HIGH);
  delay(500);  // let the sensors settle

#if USE_SOIL_1
  int raw1 = readRawAveraged(PIN_SOIL_1);
  addReading("soil_moisture_1", toPercent(raw1, SOIL_1_DRY, SOIL_1_WET), "%", "Soil moisture 1");
  addReading("soil_moisture_1_raw", raw1, "raw", "Soil moisture 1 (raw)");
#endif
#if USE_SOIL_2
  int raw2 = readRawAveraged(PIN_SOIL_2);
  addReading("soil_moisture_2", toPercent(raw2, SOIL_2_DRY, SOIL_2_WET), "%", "Soil moisture 2");
  addReading("soil_moisture_2_raw", raw2, "raw", "Soil moisture 2 (raw)");
#endif
#if USE_SOIL_TEMP
  soilTemp.begin();
  soilTemp.requestTemperatures();
  float t = soilTemp.getTempCByIndex(0);
  if (t != DEVICE_DISCONNECTED_C) addReading("soil_temp", t, "°C", "Soil temperature");
#endif
#if USE_AIR
  Wire.begin(21, 22);
  if (sht31.begin(0x44)) {
    addReading("air_temp", sht31.readTemperature(), "°C", "Air temperature");
    addReading("air_humidity", sht31.readHumidity(), "%", "Air humidity");
  }
#endif

  digitalWrite(PIN_SENSOR_POWER, LOW);
}

bool connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) delay(250);
  return WiFi.status() == WL_CONNECTED;
}

bool upload() {
  WiFiClientSecure client;
  // Pilot simplification: the connection is encrypted but the server certificate is not verified.
  // For production, pin the certificate authority with client.setCACert(...).
  client.setInsecure();
  HTTPClient http;
  if (!http.begin(client, API_URL)) return false;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + API_KEY);
  http.setTimeout(15000);
  int status = http.POST(payload);
  Serial.printf("POST %d: %s\n", status, http.getString().c_str());
  http.end();
  return status == 201;
}

void setup() {
  Serial.begin(115200);
  delay(200);

  payload = "{\"readings\":[";
  readSensors();

  if (connectWifi()) {
    addReading("wifi_rssi", WiFi.RSSI(), "dBm", "Wi-Fi signal");
    payload += "]}";
    Serial.println(payload);
    if (!upload()) Serial.println("Upload failed; will retry at the next wake-up.");
  } else {
    Serial.println("Wi-Fi not available; will retry at the next wake-up.");
  }

  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  esp_sleep_enable_timer_wakeup((uint64_t)SLEEP_MINUTES * 60ULL * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {}  // never reached: the station sleeps between measurements
