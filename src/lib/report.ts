import { query } from "./db";
import { comparableChange } from "./format";
import { previousWindow, resolvePeriod } from "./period";

export type ReportParams = { site?: string; period?: string; from?: string; to?: string };

export type ReportRow = {
  metric_id: string; site_name: string; source_name: string; metric_name: string; unit: string;
  min_threshold: number | null; max_threshold: number | null;
  n: number; min: number | null; max: number | null; avg: number | null; prev_avg: number | null; prev_n: number;
  out_of_range: number; alerts: number; critical: number;
};

const UUID = /^[0-9a-f-]{36}$/i;

/** Per-metric summary for a period, compared with the preceding period of equal length (D2 §5.7). */
export async function buildReport(params: ReportParams) {
  const period = resolvePeriod({ period: params.period ?? "30d", from: params.from, to: params.to });
  const prev = previousWindow(period.from, period.to);
  const site = params.site && UUID.test(params.site) ? params.site : null;
  const rows = await query<ReportRow>(
    `select m.id as metric_id, s.name as site_name, d.name as source_name, m.name as metric_name, m.unit,
            m.min_threshold, m.max_threshold,
            coalesce(cur.n, 0)::int as n, cur.min, cur.max, cur.avg, prv.avg as prev_avg, coalesce(prv.n, 0)::int as prev_n,
            coalesce(cur.out_of_range, 0)::int as out_of_range,
            coalesce(al.n, 0)::int as alerts, coalesce(al.critical, 0)::int as critical
     from metrics m
     join data_sources d on d.id = m.source_id
     join sites s on s.id = d.site_id
     left join lateral (
       select count(*) as n, min(value) as min, max(value) as max, avg(value) as avg,
              count(*) filter (where value > m.max_threshold or value < m.min_threshold) as out_of_range
       from readings r where r.metric_id = m.id and r.ts >= $1 and r.ts <= $2
     ) cur on true
     left join lateral (
       select avg(value) as avg, count(*) as n from readings r where r.metric_id = m.id and r.ts >= $3 and r.ts < $4
     ) prv on true
     left join lateral (
       select count(*) as n, count(*) filter (where severity = 'critical') as critical
       from alerts a where a.metric_id = m.id and a.created_at >= $1 and a.created_at <= $2
     ) al on true
     where ($5::uuid is null or s.id = $5)
     order by s.name, d.name, m.name`,
    [period.from, period.to, prev.from, prev.to, site]
  );
  return { period, rows };
}

export function changePct(row: Pick<ReportRow, "avg" | "prev_avg" | "n" | "prev_n">) {
  return comparableChange({ avg: row.avg, n: row.n }, { avg: row.prev_avg, n: row.prev_n });
}
