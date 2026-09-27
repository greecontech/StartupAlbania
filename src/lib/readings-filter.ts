import { resolvePeriod } from "./period";

export type ReadingsParams = { site?: string; metric?: string; origin?: string; period?: string; from?: string; to?: string; page?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORIGINS = ["api", "manual", "import", "simulated"];

/** Builds the WHERE clause shared by the Data page and its CSV export. */
export function readingsWhere(params: ReadingsParams) {
  const period = resolvePeriod(params);
  const conds = ["r.ts >= $1", "r.ts <= $2"];
  const values: unknown[] = [period.from, period.to];
  if (params.metric && UUID.test(params.metric)) { values.push(params.metric); conds.push(`r.metric_id = $${values.length}`); }
  else if (params.site && UUID.test(params.site)) { values.push(params.site); conds.push(`s.id = $${values.length}`); }
  if (params.origin && ORIGINS.includes(params.origin)) { values.push(params.origin); conds.push(`r.origin = $${values.length}`); }
  return { period, where: conds.join(" and "), values };
}

export const READINGS_FROM = `readings r
  join metrics m on m.id = r.metric_id
  join data_sources d on d.id = m.source_id
  join sites s on s.id = d.site_id`;
