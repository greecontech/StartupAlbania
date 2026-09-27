export type FormState = { error?: string; ok?: string; secret?: string };

export function text(form: FormData, key: string, max = 200) {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

/** Empty string → null; otherwise a finite number or NaN (so callers can reject bad input). */
export function optionalNumber(form: FormData, key: string) {
  const raw = String(form.get(key) ?? "").trim().replace(",", ".");
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

/** Machine key for a metric, e.g. `soil_moisture` — also used by the ingestion API. */
export const METRIC_KEY = /^[a-z0-9][a-z0-9_.-]{0,63}$/;
