import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { Empty, Kpi, PageHead, Panel } from "@/components/ui";
import { fmtDateTime, fmtNumber } from "@/lib/format";
import { PERIODS } from "@/lib/period";
import { listSites } from "@/lib/queries";
import { buildReport, changePct, type ReportParams } from "@/lib/report";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Reports" };

export default async function Reports({ searchParams }: { searchParams: Promise<ReportParams> }) {
  await requireUser();
  const params = await searchParams;
  const [sites, { period, rows }] = await Promise.all([listSites(), buildReport(params)]);
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();

  const totalReadings = rows.reduce((a, r) => a + r.n, 0);
  const totalOut = rows.reduce((a, r) => a + r.out_of_range, 0);
  const totalAlerts = rows.reduce((a, r) => a + r.alerts, 0);
  const totalCritical = rows.reduce((a, r) => a + r.critical, 0);
  const bySite = new Map<string, typeof rows>();
  for (const r of rows) bySite.set(r.site_name, [...(bySite.get(r.site_name) ?? []), r]);

  return (
    <div className="stack">
      <PageHead title="Reports" intro="Period summary of every metric: range, average, change against the previous period, time outside limits and alerts raised.">
        <a className="button secondary" href={`/api/export/report?${qs}`}>Export CSV</a>
        <PrintButton />
      </PageHead>

      <form className="filters" method="get">
        <label>Site
          <select name="site" defaultValue={params.site ?? ""}>
            <option value="">All sites</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label>Period
          <select name="period" defaultValue={params.period ?? "30d"}>
            {Object.entries(PERIODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label>From<input type="date" name="from" defaultValue={params.from} /></label>
        <label>To<input type="date" name="to" defaultValue={params.to} /></label>
        <div className="actions">
          <button type="submit">Generate</button>
          <Link className="button secondary" href="/reports">Reset</Link>
        </div>
      </form>

      <p className="small muted">{fmtDateTime(period.from)} – {fmtDateTime(period.to)} · compared with the preceding period of equal length</p>

      <div className="kpis">
        <Kpi label="Metrics" value={rows.length} />
        <Kpi label="Readings" value={fmtNumber(totalReadings, 0)} />
        <Kpi label="Outside limits" value={totalReadings ? fmtNumber((totalOut / totalReadings) * 100, 1) : "—"} unit="%" sub={`${fmtNumber(totalOut, 0)} readings`} />
        <Kpi label="Alerts raised" value={totalAlerts} sub={`${totalCritical} critical`} />
      </div>

      {rows.length === 0 && <Panel><Empty>No metrics to report on.</Empty></Panel>}

      {[...bySite.entries()].map(([site, list]) => (
        <Panel key={site} title={site} flush>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Metric</th><th className="num">Readings</th><th className="num">Min</th><th className="num">Max</th>
                  <th className="num">Average</th><th className="num">vs previous</th><th className="num">Outside limits</th><th className="num">Alerts</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const change = changePct(r);
                  return (
                    <tr key={r.metric_id}>
                      <td><Link href={`/monitoring?metric=${r.metric_id}`}>{r.metric_name}</Link> <span className="muted small">{r.unit}</span>
                        <div className="small muted">{r.source_name}</div></td>
                      <td className="num">{fmtNumber(r.n, 0)}</td>
                      <td className="num">{fmtNumber(r.min)}</td>
                      <td className="num">{fmtNumber(r.max)}</td>
                      <td className="num">{fmtNumber(r.avg)}</td>
                      <td className="num">{change === null ? "—" : `${change >= 0 ? "+" : ""}${fmtNumber(change, 1)}%`}</td>
                      <td className="num">{r.min_threshold === null && r.max_threshold === null ? <span className="muted">no limits</span> : r.n ? `${fmtNumber((r.out_of_range / r.n) * 100, 1)}%` : "—"}</td>
                      <td className="num" style={r.critical ? { color: "var(--critical)" } : undefined}>{r.alerts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </div>
  );
}
