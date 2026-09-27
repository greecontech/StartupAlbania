const TZ = process.env.APP_TIMEZONE || "Europe/Tirane";

export function fmtNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits }).format(value);
}

export function fmtDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(new Date(value));
}

export function fmtDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function fmtRelative(value: Date | string | null | undefined) {
  if (!value) return "never";
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

export const SECTOR_LABELS: Record<string, string> = {
  energy: "Energy",
  water: "Water",
  agriculture: "Agriculture",
  other: "Other"
};

/** Interprets a wall-clock "YYYY-MM-DDTHH:mm[:ss]" in the app timezone and returns the UTC instant. */
export function zonedToUtc(local: string, tz = TZ) {
  const guess = new Date(`${local.length === 16 ? local + ":00" : local}Z`);
  if (Number.isNaN(guess.getTime())) return guess;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).formatToParts(guess).map((p) => [p.type, p.value])
  );
  const asZoned = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return new Date(guess.getTime() - (asZoned - guess.getTime()));
}

/** Parses an ISO timestamp; strings without an offset are read in the app timezone. */
export function parseTimestamp(value: string) {
  const s = value.trim().replace(" ", "T");
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return zonedToUtc(`${s}T00:00`);
  return zonedToUtc(s);
}

export function fmtLimits(min: number | null, max: number | null) {
  if (min !== null && max !== null) return `${fmtNumber(min)} – ${fmtNumber(max)}`;
  if (max !== null) return `≤ ${fmtNumber(max)}`;
  if (min !== null) return `≥ ${fmtNumber(min)}`;
  return "none";
}

/** % change of averages, only when the previous period has comparable coverage (≥ half as many readings). */
export function comparableChange(cur: { avg: number | null; n: number } | undefined, prev: { avg: number | null; n: number } | undefined) {
  if (!cur || !prev || cur.avg === null || prev.avg === null || prev.avg === 0) return null;
  if (prev.n < cur.n * 0.5) return null;
  return ((cur.avg - prev.avg) / Math.abs(prev.avg)) * 100;
}
