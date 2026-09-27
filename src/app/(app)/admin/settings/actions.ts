"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { query } from "@/lib/db";
import { text, type FormState } from "@/lib/form-state";
import { requireUser } from "@/lib/session";

export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("admin");
  const values = {
    organization_name: text(form, "organization_name", 120),
    contact_email: text(form, "contact_email", 200)
  };
  for (const [key, value] of Object.entries(values)) {
    await query(
      "insert into settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value",
      [key, JSON.stringify(value)]
    );
  }
  await audit(user.id, "update", "settings", null, values);
  revalidatePath("/admin/settings");
  return { ok: "Settings saved." };
}
