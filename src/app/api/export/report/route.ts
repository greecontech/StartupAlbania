import { audit } from "@/lib/audit";
import { csvResponse, csvRow } from "@/lib/csv";
import { buildReport, changePct } from "@/lib/report";
import { getUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { period, rows } = await buildReport(Object.fromEntries(new URL(request.url).searchParams));
  let body = csvRow(["period_from_utc", "period_to_utc", "site", "source", "metric", "unit", "readings", "min", "max", "average",
    "previous_average", "change_pct", "readings_outside_limits", "lower_limit", "upper_limit", "alerts", "critical_alerts"]);
  for (const r of rows) {
    const change = changePct(r);
    body += csvRow([period.from, period.to, r.site_name, r.source_name, r.metric_name, r.unit, r.n, r.min, r.max, r.avg,
      r.prev_avg, change === null ? "" : change.toFixed(1), r.out_of_range, r.min_threshold, r.max_threshold, r.alerts, r.critical]);
  }
  await audit(user.id, "export", "report", null, { from: period.from, to: period.to });
  return csvResponse(`greecon-report-${period.from.toISOString().slice(0, 10)}_${period.to.toISOString().slice(0, 10)}.csv`, body);
}
