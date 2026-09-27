"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import { one, query } from "@/lib/db";
import { parseTimestamp } from "@/lib/format";
import { METRIC_KEY, optionalNumber, text, type FormState } from "@/lib/form-state";
import { recordReadings, type ReadingInput } from "@/lib/ingest";
import { requireUser } from "@/lib/session";

const MAX_IMPORT_ROWS = 20_000;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export async function addReading(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("operator");
  const metricId = text(form, "metric_id");
  const value = optionalNumber(form, "value");
  const tsRaw = text(form, "ts");
  if (value === null || Number.isNaN(value)) return { error: "Enter a numeric value." };
  const ts = tsRaw ? parseTimestamp(tsRaw) : new Date();
  if (Number.isNaN(ts.getTime()) || ts.getTime() > Date.now() + 5 * 60_000) return { error: "Enter a valid time that is not in the future." };
  const metric = await one<{ name: string }>("select name from metrics where id = $1", [metricId]);
  if (!metric) return { error: "Choose a metric." };
  const result = await recordReadings([{ metricId, ts, value }], "manual");
  await audit(user.id, "create", "reading", metricId, { value, ts: ts.toISOString() });
  revalidatePath("/data");
  return { ok: `Reading saved for ${metric.name}.${result.alertsOpened ? " It is outside the limits — an alert was raised." : ""}` };
}

export async function importCsv(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("operator");
  const sourceId = text(form, "source_id");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file." };
  if (file.size > MAX_IMPORT_BYTES) return { error: "The file is larger than 5 MB. Split it into smaller files." };
  const source = await one<{ name: string }>("select name from data_sources where id = $1", [sourceId]);
  if (!source) return { error: "Choose a data source." };

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { error: "The file needs a header row and at least one data row." };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const iMetric = col("metric", "metric_key", "key");
  const iValue = col("value");
  const iTs = col("timestamp", "timestamp_utc", "ts", "time", "date");
  if (iMetric < 0 || iValue < 0) return { error: "Header must contain `metric` and `value` columns (and optionally `timestamp`)." };
  if (rows.length - 1 > MAX_IMPORT_ROWS) return { error: `At most ${MAX_IMPORT_ROWS.toLocaleString("en")} rows per file.` };

  const parsed: { key: string; value: number; ts: Date }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const key = (r[iMetric] ?? "").trim().toLowerCase();
    const value = Number((r[iValue] ?? "").trim().replace(",", "."));
    const ts = iTs >= 0 && r[iTs]?.trim() ? parseTimestamp(r[iTs]) : new Date();
    if (!METRIC_KEY.test(key)) return { error: `Row ${i + 1}: invalid metric key “${key}”.` };
    if ((r[iValue] ?? "").trim() === "" || !Number.isFinite(value)) return { error: `Row ${i + 1}: value is not a number.` };
    if (Number.isNaN(ts.getTime())) return { error: `Row ${i + 1}: timestamp not recognised (use ISO format, e.g. 2026-09-27T10:00).` };
    parsed.push({ key, value, ts });
  }

  const ids = new Map(
    (await query<{ id: string; key: string }>("select id, key from metrics where source_id = $1", [sourceId])).map((m) => [m.key, m.id])
  );
  let created = 0;
  for (const key of new Set(parsed.map((p) => p.key))) {
    if (ids.has(key)) continue;
    const m = await one<{ id: string }>("insert into metrics (source_id, key, name) values ($1, $2, $2) returning id", [sourceId, key]);
    ids.set(key, m!.id);
    created++;
  }
  const readings: ReadingInput[] = parsed.map((p) => ({ metricId: ids.get(p.key)!, ts: p.ts, value: p.value }));
  const result = await recordReadings(readings, "import");
  await audit(user.id, "import", "readings", sourceId, { file: file.name, rows: readings.length, metricsCreated: created });
  revalidatePath("/data");
  return {
    ok: `Imported ${result.inserted.toLocaleString("en")} readings into “${source.name}”${created ? `; ${created} new metric(s) created — set their names and limits under Sites & sources` : ""}.`
  };
}
