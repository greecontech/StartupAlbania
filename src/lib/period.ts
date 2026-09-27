// Time period selection shared by monitoring, data and reports (D2 §9.7).
export const PERIODS = {
  "24h": { label: "Last 24 hours", hours: 24 },
  "7d": { label: "Last 7 days", hours: 24 * 7 },
  "30d": { label: "Last 30 days", hours: 24 * 30 },
  "90d": { label: "Last 90 days", hours: 24 * 90 }
} as const;

export type PeriodKey = keyof typeof PERIODS;

export function resolvePeriod(input: { period?: string; from?: string; to?: string }) {
  if (input.from && input.to) {
    const from = new Date(input.from);
    const to = new Date(`${input.to}T23:59:59.999Z`);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from < to) {
      return { key: "custom" as const, label: `${input.from} → ${input.to}`, from, to };
    }
  }
  const key = (input.period && input.period in PERIODS ? input.period : "7d") as PeriodKey;
  const def = PERIODS[key];
  const to = new Date();
  const from = new Date(to.getTime() - def.hours * 3_600_000);
  return { key, label: def.label, from, to };
}

/** The same-length window immediately before the given one, for period comparison. */
export function previousWindow(from: Date, to: Date) {
  const span = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - span), to: from };
}
