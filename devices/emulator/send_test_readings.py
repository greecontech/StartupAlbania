#!/usr/bin/env python3
"""Send the same readings a soil moisture station sends, without any hardware.

Use it to prepare the pilot on the platform (site, source, limits, alerts) before
the device is installed, or to check that a key and URL work.

    python3 send_test_readings.py --url https://your-app.up.railway.app --key gk_xxxxxxxx_... [--dry]

--dry sends a soil moisture value below typical limits, to test alerts.
Only the Python standard library is used.
"""
import argparse
import json
import random
import sys
import urllib.error
import urllib.request


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True, help="Base URL of the platform, e.g. https://your-app.up.railway.app")
    parser.add_argument("--key", required=True, help="API key of the Device source")
    parser.add_argument("--dry", action="store_true", help="Simulate dry soil (to test alerts)")
    args = parser.parse_args()

    moisture = random.uniform(12, 18) if args.dry else random.uniform(35, 45)
    readings = [
        {"metric": "soil_moisture_1", "value": round(moisture, 1), "unit": "%", "name": "Soil moisture 1"},
        {"metric": "soil_moisture_1_raw", "value": round(3000 - moisture * 17), "unit": "raw", "name": "Soil moisture 1 (raw)"},
        {"metric": "soil_moisture_2", "value": round(moisture + random.uniform(-3, 3), 1), "unit": "%", "name": "Soil moisture 2"},
        {"metric": "soil_moisture_2_raw", "value": round(3000 - moisture * 17), "unit": "raw", "name": "Soil moisture 2 (raw)"},
        {"metric": "soil_temp", "value": round(random.uniform(16, 20), 1), "unit": "°C", "name": "Soil temperature"},
        {"metric": "wifi_rssi", "value": random.randint(-75, -55), "unit": "dBm", "name": "Wi-Fi signal"},
    ]
    request = urllib.request.Request(
        args.url.rstrip("/") + "/api/ingest",
        data=json.dumps({"readings": readings}).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {args.key}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            print(response.status, response.read().decode())
            return 0
    except urllib.error.HTTPError as error:
        print(error.code, error.read().decode(), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
