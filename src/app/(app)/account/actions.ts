"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { one } from "@/lib/db";
import { text, type FormState } from "@/lib/form-state";
import { requireUser } from "@/lib/session";

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = text(form, "name", 120);
  if (!name) return { error: "Name is required." };
  await one("update users set name = $2 where id = $1", [user.id, name]);
  revalidatePath("/", "layout");
  return { ok: "Profile updated." };
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (next.length < 10) return { error: "The new password must have at least 10 characters." };
  if (next !== confirm) return { error: "The new passwords do not match." };
  const row = await one<{ password_hash: string }>("select password_hash from users where id = $1", [user.id]);
  if (!row || !(await bcrypt.compare(current, row.password_hash))) return { error: "The current password is incorrect." };
  await one("update users set password_hash = $2 where id = $1", [user.id, await bcrypt.hash(next, 12)]);
  await audit(user.id, "change_password", "user", user.id);
  return { ok: "Password changed." };
}
