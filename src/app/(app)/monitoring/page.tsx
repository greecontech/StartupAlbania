import Link from "next/link";
import { LineChart, type Series } from "@/components/Charts";
import { Badge, Empty, PageHead, Panel } from "@/components/ui";
import { comparableChange, fmtLimits, fmtNumber, fmtRelative } from "@/lib/format";
import { PERIODS, previousWindow, resolvePeriod } from "@/lib/period";
import { listMetrics, metricStatus, series, stats } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Monitoring" };

type Params = { site?: string; metric?: string; period?: string; from?: string; to?: string; compare?: string };

export default async function Monitoring({ searchParams }: { searchParams: Promise<Params> }) {
  await requireUser();
  const params = await searchParams;
  const all = await listMetrics();
  const sites = [...new Map(all.map((m) => [m.site_id, m.site_name])).entries()];

  const focus = all.find((m) => m.id === params.metric);
  const siteId = focus?.site_id ?? params.site ?? sites[0]?.[0];
  const selected = focus ? [focus] : all.filter((m) => m.site_id === siteId);
  const period = resolvePeriod(params);
  const compare = params.compare === "1";
  const prev = previousWindow(period.from, period.to);
  const ids = selected.map((m) => m.id);

  const [current, currentStats, previous, previousStats] = await Promise.all([
    series(ids, period.from, period.to),
    stats(ids, period.from, period.to),
    compare ? series(ids, prev.from, prev.to) : Promise.resolve(new Map()),
    stats(ids, prev.from, prev.to)
  ]);

  const link = (patch: Partial<Params>) => {
    const q = new URLSearchParams();
    const merged: Params = { site: focus ? undefined : siteId, metric: params.metric, period: period.key === "custom" ? undefined : period.key, compare: compare ? "1" : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    return `/monitoring?${q}`;
  };

  return (
    <div className="stack">
      <PageHead title="Monitoring" intro="Current state and evolution of monitored indicators, with limits and period comparison." />

      <form className="filters" method="get">
        <label>
          Site
          <select name="site" defaultValue={siteId}>
            {sites.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label>
          Metric
          <select name="metric" defaultValue={focus?.id ?? ""}>
            <option value="">All metrics of the site</option>
            {all.filter((m) => m.site_id === siteId).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label>
          From
          <input type="date" name="from" defaultValue={params.from} />
        </label>
        <label>
          To
          <input type="date" name="to" defaultValue={params.to} />
        </label>
        <label className="inline" style={{ minWidth: 0, flex: "0 0 auto" }}>
          <input type="checkbox" name="compare" value="1" defaultChecked={compare} /> Compare with previous period
        </label>
        <div className="actions"><button type="submit">Apply</button></div>
      </form>

      <div className="spread">
        <nav className="segmented" aria-label="Period">
          {Object.entries(PERIODS).map(([key, def]) => (
            <Link key={key} href={link({ period: key })} className={period.key === key ? "on" : undefined}>{def.label.replace("Last ", "")}</Link>
          ))}
        </nav>
        <span className="small muted">{period.label}{compare ? " · compared with the previous period" : ""}</span>
      </div>

      {selected.length === 0 && <Panel><Empty>No metrics yet. Add a data source under Sites &amp; sources.</Empty></Panel>}

      {selected.map((m) => {
        const s = currentStats.get(m.id);
        const p = previousStats.get(m.id);
        const change = comparableChange(s, p);
        const chartSeries: Series[] = [{ label: m.name, color: "var(--chart-1)", points: current.get(m.id) ?? [] }];
        if (compare) chartSeries.push({ label: "Previous period", color: "var(--chart-2)", points: previous.get(m.id) ?? [], dashed: true });
        return (
          <Panel key={m.id}
            title={<>{m.name} <span className="muted small">({m.unit || "no unit"})</span></>}
            meta={`${m.site_name} · ${m.source_name} · last reading ${fmtRelative(m.last_ts)}`}
            actions={<>
              <Badge status={metricStatus(m)} />
              <Link className="button secondary small" href={`/data?metric=${m.id}`}>Readings</Link>
            </>}>
            <div className="stack" style={{ gap: 14 }}>
              <div className="kpis">
                <div className="kpi"><div className="label">Current</div><div className="value">{fmtNumber(m.last_value)}<small>{m.unit}</small></div></div>
                <div className="kpi"><div className="label">Average</div><div className="value">{fmtNumber(s?.avg)}<small>{m.unit}</small></div>
                  <div className="sub">{change === null ? "not enough previous data to compare" : `${change >= 0 ? "+" : ""}${fmtNumber(change, 1)}% vs previous period`}</div></div>
                <div className="kpi"><div className="label">Min / Max</div><div className="value" style={{ fontSize: 20 }}>{fmtNumber(s?.min)} – {fmtNumber(s?.max)}</div></div>
                <div className="kpi"><div className="label">Limits</div><div className="value" style={{ fontSize: 20 }}>{fmtLimits(m.min_threshold, m.max_threshold)}</div>
                  <div className="sub">{s?.n ?? 0} readings in period</div></div>
              </div>
              <LineChart series={chartSeries} from={period.from} to={period.to} unit={m.unit}
                min={m.min_threshold} max={m.max_threshold}
                alignTo={compare ? { "Previous period": prev } : undefined} />
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
