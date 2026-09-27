import { query } from "./db";
import { evaluate } from "./thresholds";

export type MetricInfo = {
  id: string;
  key: string;
  name: string;
  unit: string;
  min_threshold: number | null;
  max_threshold: number | null;
  source_id: string;
  source_name: string;
  source_kind: string;
  site_id: string;
  site_name: string;
  sector: string;
  last_value: number | null;
  last_ts: Date | null;
};

export async function listMetrics(filter: { siteId?: string } = {}) {
  return query<MetricInfo>(
    `select m.id, m.key, m.name, m.unit, m.min_threshold, m.max_threshold,
            d.id as source_id, d.name as source_name, d.kind as source_kind,
            s.id as site_id, s.name as site_name, s.sector,
            l.value as last_value, l.ts as last_ts
     from metrics m
     join data_sources d on d.id = m.source_id
     join sites s on s.id = d.site_id
     left join lateral (select value, ts from readings r where r.metric_id = m.id order by ts desc limit 1) l on true
     where ($1::uuid is null or s.id = $1)
     order by s.name, d.name, m.name`,
    [filter.siteId ?? null]
  );
}

export function metricStatus(m: Pick<MetricInfo, "min_threshold" | "max_threshold" | "last_value" | "last_ts">) {
  if (m.last_value === null || !m.last_ts) return "offline";
  if (Date.now() - new Date(m.last_ts).getTime() > 3 * 3_600_000) return "stale";
  return evaluate(m, m.last_value)?.severity ?? "ok";
}

/** Bucket width targeting ~200 points per chart. */
export function bucketFor(from: Date, to: Date) {
  const minutes = (to.getTime() - from.getTime()) / 60_000 / 200;
  const steps = [1, 5, 15, 30, 60, 180, 360, 720, 1440];
  const chosen = steps.find((s) => s >= minutes) ?? 1440;
  return `${chosen} minutes`;
}

export async function series(metricIds: string[], from: Date, to: Date) {
  if (metricIds.length === 0) return new Map<string, { t: Date; v: number }[]>();
  const rows = await query<{ metric_id: string; t: Date; v: number }>(
    `select metric_id, date_bin($4::interval, ts, timestamptz '2000-01-01') as t, avg(value) as v
     from readings
     where metric_id = any($1::uuid[]) and ts >= $2 and ts <= $3
     group by metric_id, t order by t`,
    [metricIds, from, to, bucketFor(from, to)]
  );
  const out = new Map<string, { t: Date; v: number }[]>();
  for (const id of metricIds) out.set(id, []);
  for (const r of rows) out.get(r.metric_id)!.push({ t: new Date(r.t), v: Number(r.v) });
  return out;
}

export type Stats = { metric_id: string; n: number; min: number | null; max: number | null; avg: number | null; first: number | null; last: number | null };

export async function stats(metricIds: string[], from: Date, to: Date) {
  if (metricIds.length === 0) return new Map<string, Stats>();
  const rows = await query<Stats>(
    `select metric_id, count(*)::int as n, min(value) as min, max(value) as max, avg(value) as avg,
            (array_agg(value order by ts asc))[1] as first,
            (array_agg(value order by ts desc))[1] as last
     from readings where metric_id = any($1::uuid[]) and ts >= $2 and ts <= $3
     group by metric_id`,
    [metricIds, from, to]
  );
  return new Map(rows.map((r) => [r.metric_id, r]));
}

export async function listSites() {
  return query<{ id: string; name: string; sector: string; location: string; description: string }>(
    "select id, name, sector, location, description from sites order by name"
  );
}
