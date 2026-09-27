// Server-rendered SVG charts (D2 §9.5): no client JS, accessible text summaries.
import { fmtNumber } from "@/lib/format";

export type Point = { t: Date; v: number };
export type Series = { label: string; color: string; points: Point[]; dashed?: boolean };

const W = 760;
const PAD = { top: 12, right: 12, bottom: 26, left: 48 };

function niceTicks(min: number, max: number, count = 5) {
  if (min === max) { min -= 1; max += 1; }
  const step = Math.pow(10, Math.floor(Math.log10((max - min) / count)));
  const err = ((max - min) / count) / step;
  const nice = step * (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1);
  const lo = Math.floor(min / nice) * nice;
  const hi = Math.ceil(max / nice) * nice;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + nice / 2; v += nice) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

function timeLabel(t: Date, spanMs: number) {
  const tz = process.env.APP_TIMEZONE || "Europe/Tirane";
  const opts: Intl.DateTimeFormatOptions = spanMs <= 36 * 3_600_000
    ? { hour: "2-digit", minute: "2-digit", timeZone: tz }
    : { day: "2-digit", month: "short", timeZone: tz };
  return new Intl.DateTimeFormat("en-GB", opts).format(t);
}

export function LineChart({
  series, from, to, height = 260, min, max, unit, alignTo
}: {
  series: Series[]; from: Date; to: Date; height?: number;
  min?: number | null; max?: number | null; unit?: string;
  /** Map each series' time axis onto [from, to] from its own window (for previous-period overlays). */
  alignTo?: Record<string, { from: Date; to: Date }>;
}) {
  const H = height;
  const x0 = from.getTime();
  const span = Math.max(1, to.getTime() - x0);
  const values = series.flatMap((s) => s.points.map((p) => p.v));
  if (min != null) values.push(min);
  if (max != null) values.push(max);
  if (values.length === 0 || series.every((s) => s.points.length === 0)) {
    return <div className="empty">No readings in this period.</div>;
  }
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const px = (t: number) => PAD.left + ((t - x0) / span) * (W - PAD.left - PAD.right);
  const py = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD.top - PAD.bottom);

  const xTicks = Array.from({ length: 6 }, (_, i) => x0 + (span * i) / 5);

  const path = (s: Series) => {
    const shift = alignTo?.[s.label] ? x0 - alignTo[s.label].from.getTime() : 0;
    return s.points
      .map((p, i) => `${i === 0 ? "M" : "L"}${px(p.t.getTime() + shift).toFixed(1)},${py(p.v).toFixed(1)}`)
      .join(" ");
  };

  const summary = series
    .map((s) => {
      const vs = s.points.map((p) => p.v);
      return vs.length ? `${s.label}: ${vs.length} points, min ${fmtNumber(Math.min(...vs))}, max ${fmtNumber(Math.max(...vs))}${unit ? " " + unit : ""}` : `${s.label}: no data`;
    })
    .join("; ");

  return (
    <figure style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
        {min != null && max != null && (
          <rect className="band" x={PAD.left} width={W - PAD.left - PAD.right} y={py(max)} height={Math.max(0, py(min) - py(max))} />
        )}
        <g className="grid">
          {ticks.map((v) => <line key={v} x1={PAD.left} x2={W - PAD.right} y1={py(v)} y2={py(v)} />)}
        </g>
        <g className="axis">
          {ticks.map((v) => (
            <text key={v} x={PAD.left - 8} y={py(v) + 4} textAnchor="end">{fmtNumber(v)}</text>
          ))}
          {xTicks.map((t, i) => (
            <text key={t} x={px(t)} y={H - 6} textAnchor={i === 0 ? "start" : i === 5 ? "end" : "middle"}>
              {timeLabel(new Date(t), span)}
            </text>
          ))}
        </g>
        {min != null && <line className="limit" x1={PAD.left} x2={W - PAD.right} y1={py(min)} y2={py(min)} />}
        {max != null && <line className="limit" x1={PAD.left} x2={W - PAD.right} y1={py(max)} y2={py(max)} />}
        {series.map((s) => (
          <path key={s.label} d={path(s)} fill="none" stroke={s.color} strokeWidth={1.7}
            strokeDasharray={s.dashed ? "5 4" : undefined} strokeLinejoin="round" strokeLinecap="round" />
        ))}
      </svg>
      <figcaption className="legend">
        {series.map((s) => (
          <span key={s.label}>
            <i style={{ background: s.color, opacity: s.dashed ? 0.6 : 1 }} />
            {s.label}
          </span>
        ))}
        {(min != null || max != null) && (
          <span><i style={{ background: "var(--critical)", opacity: 0.7 }} />Limits</span>
        )}
      </figcaption>
    </figure>
  );
}

export function Sparkline({ values, width = 200, height = 36, color = "var(--chart-1)" }: {
  values: number[]; width?: number; height?: number; color?: string;
}) {
  if (values.length < 2) return <svg className="spark" width={width} height={height} aria-hidden="true" />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (width - 2) + 1;
      const y = height - 2 - ((v - lo) / (hi - lo || 1)) * (height - 4);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="spark" width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" height={height} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
