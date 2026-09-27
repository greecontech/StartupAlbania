// Pure threshold evaluation (D2 §5.6, §9.6) — no I/O, unit-tested in tests/thresholds.test.ts.

export type Thresholds = { min_threshold: number | null; max_threshold: number | null };
export type Breach = { kind: "above" | "below"; severity: "warning" | "critical"; threshold: number };

/** Share of the threshold magnitude beyond which a breach is critical rather than a warning. */
export const CRITICAL_MARGIN = 0.1;

export function evaluate(metric: Thresholds, value: number): Breach | null {
  const { min_threshold: min, max_threshold: max } = metric;
  if (max !== null && value > max) {
    return { kind: "above", threshold: max, severity: severity(value - max, max, min) };
  }
  if (min !== null && value < min) {
    return { kind: "below", threshold: min, severity: severity(min - value, min, max) };
  }
  return null;
}

function severity(excess: number, threshold: number, other: number | null): Breach["severity"] {
  // Scale by the band width when both bounds exist, otherwise by the threshold itself.
  const scale = other !== null ? Math.abs(threshold - other) : Math.abs(threshold);
  if (scale === 0) return "critical";
  return excess / scale >= CRITICAL_MARGIN ? "critical" : "warning";
}
