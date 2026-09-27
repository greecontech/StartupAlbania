import { csvResponse, csvRow } from "@/lib/csv";
import { query } from "@/lib/db";
import { READINGS_FROM, readingsWhere } from "@/lib/readings-filter";
import { getUser } from "@/lib/session";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
const MAX_ROWS = 200_000;

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const { where, values } = readingsWhere(params);
  const rows = await query<{ ts: Date; site: string; source: string; key: string; name: string; value: number; unit: string; origin: string }>(
    `select r.ts, s.name as site, d.name as source, m.key, m.name, r.value, m.unit, r.origin
     from ${READINGS_FROM} where ${where} order by r.ts desc limit ${MAX_ROWS}`,
    values
  );
  let body = csvRow(["timestamp_utc", "site", "source", "metric_key", "metric", "value", "unit", "origin"]);
  for (const r of rows) body += csvRow([r.ts, r.site, r.source, r.key, r.name, r.value, r.unit, r.origin]);
  await audit(user.id, "export", "readings", null, { rows: rows.length });
  return csvResponse(`greecon-readings-${new Date().toISOString().slice(0, 10)}.csv`, body);
}
