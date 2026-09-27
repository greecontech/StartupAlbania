import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Empty, PageHead, Panel } from "@/components/ui";
import { one, query } from "@/lib/db";
import { fmtDateTime, fmtNumber } from "@/lib/format";
import { PERIODS } from "@/lib/period";
import { listMetrics } from "@/lib/queries";
import { READINGS_FROM, readingsWhere, type ReadingsParams } from "@/lib/readings-filter";
import { atLeast } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { addReading, importCsv } from "./actions";

export const metadata = { title: "Data" };
const PAGE_SIZE = 50;

export default async function Data({ searchParams }: { searchParams: Promise<ReadingsParams> }) {
  const user = await requireUser();
  const params = await searchParams;
  const canEdit = atLeast(user.role, "operator");
  const page = Math.max(1, Number(params.page) || 1);
  const { period, where, values } = readingsWhere(params);

  const [metrics, sources, total, rows] = await Promise.all([
    listMetrics(),
    query<{ id: string; name: string; site_name: string }>(
      "select d.id, d.name, s.name as site_name from data_sources d join sites s on s.id = d.site_id where d.active order by s.name, d.name"
    ),
    one<{ n: number }>(`select count(*)::int as n from ${READINGS_FROM} where ${where}`, values),
    query<{ id: string; ts: Date; value: number; origin: string; metric_name: string; unit: string; site_name: string; source_name: string; min_threshold: number | null; max_threshold: number | null }>(
      `select r.id, r.ts, r.value, r.origin, m.name as metric_name, m.unit, m.min_threshold, m.max_threshold,
              s.name as site_name, d.name as source_name
       from ${READINGS_FROM} where ${where} order by r.ts desc limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`,
      values
    )
  ]);
  const sites = [...new Map(metrics.map((m) => [m.site_id, m.site_name])).entries()];
  const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PAGE_SIZE));

  const qs = (patch: Partial<ReadingsParams>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...patch })) if (v) q.set(k, String(v));
    return q.toString();
  };

  return (
    <div className="stack">
      <PageHead title="Data" intro="Every stored reading, with filtering, manual entry, CSV import and export.">
        <a className="button secondary" href={`/api/export/readings?${qs({ page: undefined })}`}>Export CSV</a>
      </PageHead>

      <form className="filters" method="get">
        <label>Site
          <select name="site" defaultValue={params.site ?? ""}>
            <option value="">All sites</option>
            {sites.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label>Metric
          <select name="metric" defaultValue={params.metric ?? ""}>
            <option value="">All metrics</option>
            {metrics.map((m) => <option key={m.id} value={m.id}>{m.site_name} — {m.name}</option>)}
          </select>
        </label>
        <label>Origin
          <select name="origin" defaultValue={params.origin ?? ""}>
            <option value="">Any</option>
            <option value="api">API / device</option>
            <option value="manual">Manual</option>
            <option value="import">CSV import</option>
            <option value="simulated">Simulated</option>
          </select>
        </label>
        <label>Period
          <select name="period" defaultValue={params.period ?? "7d"}>
            {Object.entries(PERIODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label>From<input type="date" name="from" defaultValue={params.from} /></label>
        <label>To<input type="date" name="to" defaultValue={params.to} /></label>
        <div className="actions">
          <button type="submit">Filter</button>
          <Link className="button secondary" href="/data">Reset</Link>
        </div>
      </form>

      <Panel title={`${fmtNumber(total?.n ?? 0, 0)} readings`} meta={period.label} flush>
        {rows.length === 0 ? <Empty>No readings match these filters.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Time</th><th>Site</th><th>Metric</th><th className="num">Value</th><th>Origin</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const out = (r.max_threshold !== null && r.value > r.max_threshold) || (r.min_threshold !== null && r.value < r.min_threshold);
                  return (
                    <tr key={r.id}>
                      <td className="small">{fmtDateTime(r.ts)}</td>
                      <td className="small">{r.site_name}<div className="muted">{r.source_name}</div></td>
                      <td>{r.metric_name}</td>
                      <td className="num" style={out ? { color: "var(--critical)" } : undefined}>{fmtNumber(r.value)} <span className="muted small">{r.unit}</span></td>
                      <td><Badge status={r.origin === "simulated" ? "simulated" : "neutral"} label={r.origin} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {pages > 1 && (
        <div className="row end small">
          {page > 1 && <Link className="button secondary small" href={`/data?${qs({ page: String(page - 1) })}`}>Newer</Link>}
          <span className="muted">Page {page} of {fmtNumber(pages, 0)}</span>
          {page < pages && <Link className="button secondary small" href={`/data?${qs({ page: String(page + 1) })}`}>Older</Link>}
        </div>
      )}

      {canEdit && (
        <div className="grid-2">
          <Panel title="Manual entry" meta="Record a reading by hand (time in Albania local time)">
            {metrics.length === 0 ? <Empty>Add a metric under Sites &amp; sources first.</Empty> : (
              <ActionForm action={addReading} submit="Save reading">
                <label style={{ gridColumn: "1 / -1" }}>Metric
                  <select name="metric_id" required defaultValue={params.metric ?? ""}>
                    <option value="" disabled>Choose…</option>
                    {metrics.map((m) => <option key={m.id} value={m.id}>{m.site_name} — {m.name} ({m.unit})</option>)}
                  </select>
                </label>
                <label>Value<input name="value" inputMode="decimal" required /></label>
                <label>Time<input name="ts" type="datetime-local" /></label>
              </ActionForm>
            )}
          </Panel>
          <Panel title="CSV import" meta="Columns: metric, value, timestamp (optional). Max 20,000 rows / 5 MB.">
            {sources.length === 0 ? <Empty>Add a data source first.</Empty> : (
              <ActionForm action={importCsv} submit="Import">
                <label style={{ gridColumn: "1 / -1" }}>Into source
                  <select name="source_id" required defaultValue="">
                    <option value="" disabled>Choose…</option>
                    {sources.map((s) => <option key={s.id} value={s.id}>{s.site_name} — {s.name}</option>)}
                  </select>
                </label>
                <label style={{ gridColumn: "1 / -1" }}>File<input name="file" type="file" accept=".csv,text/csv" required /></label>
              </ActionForm>
            )}
            <pre className="mono small muted" style={{ margin: "12px 0 0" }}>{`metric,value,timestamp
soil_moisture,31.4,2026-09-27T10:00
air_temp,24.8,2026-09-27T10:00`}</pre>
          </Panel>
        </div>
      )}
    </div>
  );
}
