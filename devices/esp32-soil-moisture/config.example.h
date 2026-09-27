// Copy this file to config.h and fill in your values. config.h is git-ignored (it holds secrets).
#pragma once

// --- Network ---------------------------------------------------------------
#define WIFI_SSID       "your-wifi-name"
#define WIFI_PASSWORD   "your-wifi-password"

// --- Greecon Platform --------------------------------------------------------
// Full URL of the ingestion endpoint of your deployment.
#define API_URL         "https://your-app.up.railway.app/api/ingest"
// Key shown once when you create a "Device" source under Sites & sources.
#define API_KEY         "gk_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

// --- Measurement interval ------------------------------------------------------
#define SLEEP_MINUTES   10

// --- Sensors (set to 0 for any sensor you did not connect) -----------------------
#define USE_SOIL_1      1   // capacitive soil moisture sensor on GPIO34
#define USE_SOIL_2      1   // second capacitive sensor on GPIO35
#define USE_SOIL_TEMP   1   // DS18B20 waterproof probe on GPIO4 (4.7 kΩ pull-up to 3.3 V)
#define USE_AIR         0   // SHT31 air temperature/humidity on I2C (SDA GPIO21, SCL GPIO22)

// --- Calibration (raw ADC readings, see README "Calibration") -------------------
// DRY = sensor in open air, WET = sensor in a glass of water.
#define SOIL_1_DRY      3000
#define SOIL_1_WET      1300
#define SOIL_2_DRY      3000
#define SOIL_2_WET      1300
