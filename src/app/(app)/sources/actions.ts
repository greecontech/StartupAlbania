"use server";

import { revalidatePath } from "next/cache";
import { generateApiKey } from "@/lib/apikey";
import { audit } from "@/lib/audit";
import { one, query } from "@/lib/db";
import { METRIC_KEY, optionalNumber, text, type FormState } from "@/lib/form-state";
import { requireUser } from "@/lib/session";

const SECTORS = ["energy", "water", "agriculture", "other"];
const KINDS = ["device", "api", "manual"];

function done(message: string, extra: Partial<FormState> = {}): FormState {
  revalidatePath("/sources");
  revalidatePath("/");
  return { ok: message, ...extra };
}

function limits(form: FormData): { min: number | null; max: number | null } | string {
  const min = optionalNumber(form, "min");
  const max = optionalNumber(form, "max");
  if (Number.isNaN(min) || Number.isNaN(max)) return "Limits must be numbers.";
  if (min !== null && max !== null && min >= max) return "The lower limit must be below the upper limit.";
  return { min, max };
}

export async function createSite(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("operator");
  const name = text(form, "name", 120);
  const sector = text(form, "sector");
  if (!name) return { error: "Site name is required." };
  if (!SECTORS.includes(sector)) return { error: "Choose a sector." };
  const site = await one<{ id: string }>(
    "insert into sites (name, sector, location, description) values ($1, $2, $3, $4) returning id",
    [name, sector, text(form, "location", 200), text(form, "description", 500)]
  );
  await audit(user.id, "create", "site", site!.id, { name });
  return done(`Site “${name}” created.`);
}

export async function deleteSite(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("admin");
  const id = text(form, "id");
  const site = await one<{ name: string }>("delete from sites where id = $1 returning name", [id]);
  if (!site) return { error: "Site not found." };
  await audit(user.id, "delete", "site", id, { name: site.name });
  return done(`Site “${site.name}” and its data were deleted.`);
}

export async function createSource(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("operator");
  const siteId = text(form, "site_id");
  const name = text(form, "name", 120);
  const kind = text(form, "kind");
  if (!name) return { error: "Source name is required." };
  if (!KINDS.includes(kind)) return { error: "Choose a source type." };
  const key = kind === "manual" ? null : generateApiKey();
  const source = await one<{ id: string }>(
    "insert into data_sources (site_id, name, kind, api_key_hash, api_key_prefix) values ($1, $2, $3, $4, $5) returning id",
    [siteId, name, kind, key?.hash ?? null, key?.prefix ?? null]
  );
  await audit(user.id, "create", "data_source", source!.id, { name, kind });
  return key
    ? done(`Source “${name}” created. Its ingestion API key is below.`, { secret: key.key })
    : done(`Source “${name}” created for manual data entry.`);
}

export async function rotateKey(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("operator");
  const id = text(form, "id");
  const key = generateApiKey();
  const source = await one<{ name: string }>(
    "update data_sources set api_key_hash = $2, api_key_prefix = $3 where id = $1 and kind in ('device', 'api') returning name",
    [id, key.hash, key.prefix]
  );
  if (!source) return { error: "Only device and API sources have keys." };
  await audit(user.id, "rotate_key", "data_source", id);
  return done(`New key for “${source.name}”. The previous key no longer works.`, { secret: key.key });
}

export async function toggleSource(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("operator");
  const id = text(form, "id");
  const source = await one<{ name: string; active: boolean }>(
    "update data_sources set active = not active where id = $1 returning name, active",
    [id]
  );
  if (!source) return { error: "Source not found." };
  await audit(user.id, source.active ? "activate" : "deactivate", "data_source", id);
  return done(`“${source.name}” ${source.active ? "activated" : "deactivated"}.`);
}

export async function deleteSource(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("admin");
  const id = text(form, "id");
  const source = await one<{ name: string }>("delete from data_sources where id = $1 returning name", [id]);
  if (!source) return { error: "Source not found." };
  await audit(user.id, "delete", "data_source", id, { name: source.name });
  return done(`Source “${source.name}” and its readings were deleted.`);
}

export async function addMetric(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("operator");
  const sourceId = text(form, "source_id");
  const key = text(form, "key", 64).toLowerCase();
  const name = text(form, "name", 120);
  if (!METRIC_KEY.test(key)) return { error: "Key: lowercase letters, digits, _ . - (e.g. soil_moisture)." };
  if (!name) return { error: "Metric name is required." };
  const l = limits(form);
  if (typeof l === "string") return { error: l };
  const exists = await one("select 1 from metrics where source_id = $1 and key = $2", [sourceId, key]);
  if (exists) return { error: `This source already has a metric “${key}”.` };
  const metric = await one<{ id: string }>(
    "insert into metrics (source_id, key, name, unit, min_threshold, max_threshold) values ($1, $2, $3, $4, $5, $6) returning id",
    [sourceId, key, name, text(form, "unit", 20), l.min, l.max]
  );
  await audit(user.id, "create", "metric", metric!.id, { key, name });
  return done(`Metric “${name}” added.`);
}

export async function updateMetric(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("operator");
  const id = text(form, "id");
  const name = text(form, "name", 120);
  if (!name) return { error: "Metric name is required." };
  const l = limits(form);
  if (typeof l === "string") return { error: l };
  const rows = await query(
    "update metrics set name = $2, unit = $3, min_threshold = $4, max_threshold = $5 where id = $1 returning id",
    [id, name, text(form, "unit", 20), l.min, l.max]
  );
  if (!rows.length) return { error: "Metric not found." };
  await audit(user.id, "update", "metric", id, { name, min: l.min, max: l.max });
  return done("Metric updated. New limits apply from the next reading.");
}

export async function deleteMetric(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("admin");
  const id = text(form, "id");
  const metric = await one<{ name: string }>("delete from metrics where id = $1 returning name", [id]);
  if (!metric) return { error: "Metric not found." };
  await audit(user.id, "delete", "metric", id, { name: metric.name });
  return done(`Metric “${metric.name}” and its readings were deleted.`);
}
