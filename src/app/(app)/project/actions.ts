"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { one } from "@/lib/db";
import { text, type FormState } from "@/lib/form-state";
import { requireUser } from "@/lib/session";

const STATUSES = ["planned", "in_progress", "done"];

export async function updateProjectItem(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("operator");
  const id = text(form, "id");
  const status = text(form, "status");
  const note = text(form, "note", 500);
  if (!STATUSES.includes(status)) return { error: "Choose a status." };
  const item = await one<{ code: string }>(
    "update project_items set status = $2, note = $3 where id = $1 and kind <> 'result' returning code",
    [id, status, note]
  );
  if (!item) return { error: "Item not found." };
  await audit(user.id, "update", "project_item", id, { status, note });
  revalidatePath("/project");
  return { ok: `${item.code} updated.` };
}
