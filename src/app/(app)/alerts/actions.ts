"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function acknowledgeAlert(form: FormData) {
  const user = await requireUser("operator");
  const id = String(form.get("id"));
  const rows = await query(
    "update alerts set status = 'acknowledged', acknowledged_by = $2, acknowledged_at = now() where id = $1 and status = 'open' returning id",
    [id, user.id]
  );
  if (rows.length) await audit(user.id, "acknowledge", "alert", id);
  revalidatePath("/alerts");
}

export async function resolveAlert(form: FormData) {
  const user = await requireUser("operator");
  const id = String(form.get("id"));
  const rows = await query(
    "update alerts set status = 'resolved', resolved_at = now() where id = $1 and status <> 'resolved' returning id",
    [id]
  );
  if (rows.length) await audit(user.id, "resolve", "alert", id);
  revalidatePath("/alerts");
}
