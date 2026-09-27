// Ingestion endpoint for devices and external systems (D2 §5.3–5.4).
import { timingSafeEqual } from "node:crypto";
import { hashKey, parsePrefix } from "@/lib/apikey";
import { one, query } from "@/lib/db";
import { METRIC_KEY } from "@/lib/form-state";
import { recordReadings, type ReadingInput } from "@/lib/ingest";

export const dynamic = "force-dynamic";

const MAX_READINGS = 5000;
const MAX_FUTURE_MS = 5 * 60_000;

type Incoming = { metric?: unknown; value?: unknown; ts?: unknown; unit?: unknown; name?: unknown };

function fail(status: number, error: string, detail?: unknown) {
  return Response.json({ error, ...(detail ? { detail } : {}) }, { status });
}

export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : request.headers.get("x-api-key")?.trim() ?? "";
  const prefix = parsePrefix(key);
  if (!prefix) return fail(401, "Missing or malformed API key");

  const source = await one<{ id: string; api_key_hash: string; active: boolean }>(
    "select id, api_key_hash, active from data_sources where api_key_prefix = $1",
    [prefix]
  );
  const expected = Buffer.from(source?.api_key_hash ?? "0".repeat(64), "hex");
  const given = Buffer.from(hashKey(key), "hex");
  if (!source || !timingSafeEqual(expected, given)) return fail(401, "Invalid API key");
  if (!source.active) return fail(403, "Data source is deactivated");

  let body: { readings?: Incoming[] } | Incoming[];
  try {
    body = await request.json();
  } catch {
    return fail(400, "Body must be JSON");
  }
  const items = Array.isArray(body) ? body : body?.readings;
  if (!Array.isArray(items) || items.length === 0) return fail(400, "Provide a non-empty `readings` array");
  if (items.length > MAX_READINGS) return fail(413, `At most ${MAX_READINGS} readings per request`);

  const errors: { index: number; error: string }[] = [];
  const valid: { key: string; value: number; ts: Date; unit?: string; name?: string }[] = [];
  const now = Date.now();
  items.forEach((item, index) => {
    const key = typeof item?.metric === "string" ? item.metric.trim().toLowerCase() : "";
    const value = typeof item?.value === "number" ? item.value : Number(item?.value);
    const ts = item?.ts === undefined ? new Date(now) : new Date(String(item.ts));
    if (!METRIC_KEY.test(key)) return errors.push({ index, error: "invalid metric key" });
    if (item?.value === null || item?.value === "" || !Number.isFinite(value)) return errors.push({ index, error: "value must be a number" });
    if (Number.isNaN(ts.getTime()) || ts.getTime() > now + MAX_FUTURE_MS) return errors.push({ index, error: "invalid or future timestamp" });
    valid.push({
      key, value, ts,
      unit: typeof item.unit === "string" ? item.unit.slice(0, 20) : undefined,
      name: typeof item.name === "string" ? item.name.slice(0, 120) : undefined
    });
  });
  if (errors.length) return fail(422, "Some readings are invalid; nothing was stored", errors.slice(0, 50));

  // Resolve metric keys, creating unknown ones.
  const metricIds = new Map<string, string>();
  const existing = await query<{ id: string; key: string }>(
    "select id, key from metrics where source_id = $1 and key = any($2::text[])",
    [source.id, [...new Set(valid.map((v) => v.key))]]
  );
  for (const m of existing) metricIds.set(m.key, m.id);
  let metricsCreated = 0;
  for (const v of valid) {
    if (metricIds.has(v.key)) continue;
    const created = await one<{ id: string }>(
      `insert into metrics (source_id, key, name, unit) values ($1, $2, $3, $4)
       on conflict (source_id, key) do update set key = excluded.key returning id`,
      [source.id, v.key, v.name ?? v.key, v.unit ?? ""]
    );
    metricIds.set(v.key, created!.id);
    metricsCreated++;
  }

  const readings: ReadingInput[] = valid.map((v) => ({ metricId: metricIds.get(v.key)!, ts: v.ts, value: v.value }));
  const result = await recordReadings(readings, "api");
  return Response.json({ ...result, metricsCreated }, { status: 201 });
}
