// Deterministic demo model for the three Greecon use cases (energy, water, agriculture).
// Used for the initial seed and the optional live simulator; clearly labelled "simulated" in the UI.

type MetricModel = {
  key: string;
  name: string;
  unit: string;
  min?: number;
  max?: number;
  value: (t: Date) => number;
};

type SiteModel = {
  name: string;
  sector: "energy" | "water" | "agriculture";
  location: string;
  description: string;
  source: string;
  metrics: MetricModel[];
};

/** Stable pseudo-random value in [-1, 1] for a timestamp and salt. */
function noise(t: Date, salt: number) {
  const x = Math.sin(Math.floor(t.getTime() / 60_000) * 12.9898 + salt * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

const hourOf = (t: Date) => ((t.getUTCHours() + 2) % 24) + t.getUTCMinutes() / 60; // approx. Europe/Tirane
const dayOf = (t: Date) => Math.floor(t.getTime() / 86_400_000);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

function solar(t: Date) {
  const h = hourOf(t);
  if (h < 6 || h > 19.5) return 0;
  const cloud = 0.75 + 0.25 * Math.sin(dayOf(t) * 1.7);
  return Math.sin(((h - 6) / 13.5) * Math.PI) * 48 * cloud;
}

export const DEMO_SITES: SiteModel[] = [
  {
    name: "Durana Tech Park — Solar PV",
    sector: "energy",
    location: "Durana Tech Park, Shijak",
    description: "Rooftop photovoltaic installation feeding the Tech Park building.",
    source: "PV inverter",
    metrics: [
      { key: "pv_power", name: "PV power", unit: "kW", value: (t) => r1(clamp(solar(t) + noise(t, 1) * 1.5, 0, 50)) },
      { key: "grid_voltage", name: "Grid voltage", unit: "V", min: 215, max: 245, value: (t) => r1(230 + noise(t, 2) * 4 + (dayOf(t) % 11 === 0 && hourOf(t) > 18 ? 17 : 0)) },
      { key: "inverter_temp", name: "Inverter temperature", unit: "°C", max: 65, value: (t) => r1(24 + solar(t) * 0.7 + noise(t, 3) * 1.5) }
    ]
  },
  {
    name: "Pumping station — Xhafzotaj",
    sector: "water",
    location: "Xhafzotaj, Shijak",
    description: "Irrigation pumping station with storage tank and pressure line.",
    source: "Pump controller",
    metrics: [
      { key: "flow_rate", name: "Flow rate", unit: "m³/h", value: (t) => { const h = hourOf(t); return r1((h >= 5 && h < 9) || (h >= 18 && h < 21) ? 22 + noise(t, 4) * 2 : Math.max(0, noise(t, 5) * 0.6)); } },
      { key: "tank_level", name: "Tank level", unit: "%", min: 25, max: 95, value: (t) => r1(clamp(60 + 25 * Math.sin((hourOf(t) / 24) * 2 * Math.PI) + noise(t, 6) * 2 - (dayOf(t) % 9 === 0 ? 18 : 0), 0, 100)) },
      { key: "line_pressure", name: "Line pressure", unit: "bar", min: 2.5, max: 4.5, value: (t) => Math.round((3.3 + noise(t, 7) * 0.25) * 100) / 100 }
    ]
  },
  {
    name: "Greenhouse pilot — Shijak",
    sector: "agriculture",
    location: "Shijak, Durrës",
    description: "Pilot greenhouse with soil moisture and climate sensors.",
    source: "Climate & soil sensors",
    metrics: [
      { key: "soil_moisture", name: "Soil moisture", unit: "%", min: 25, value: (t) => { const sinceIrrigation = (t.getTime() / 3_600_000) % 36; return r1(clamp(48 - sinceIrrigation * 0.75 + noise(t, 8), 5, 60)); } },
      { key: "air_temp", name: "Air temperature", unit: "°C", max: 32, value: (t) => r1(21 + 7 * Math.sin(((hourOf(t) - 9) / 24) * 2 * Math.PI) + noise(t, 9)) },
      { key: "humidity", name: "Relative humidity", unit: "%", value: (t) => r1(clamp(68 - 12 * Math.sin(((hourOf(t) - 9) / 24) * 2 * Math.PI) + noise(t, 10) * 3, 20, 100)) }
    ]
  }
];

const byKey = new Map(DEMO_SITES.flatMap((s) => s.metrics.map((m) => [m.key, m] as const)));

export function demoValue(key: string, t: Date) {
  return byKey.get(key)?.value(t) ?? null;
}
