"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { one } from "@/lib/db";
import { text, type FormState } from "@/lib/form-state";
import { ROLES, type Role } from "@/lib/roles";
import { requireUser } from "@/lib/session";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function otherActiveAdmins(exceptId: string) {
  const row = await one<{ n: number }>("select count(*)::int as n from users where role = 'admin' and active and id <> $1", [exceptId]);
  return row?.n ?? 0;
}

export async function createUser(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireUser("admin");
  const email = text(form, "email", 200).toLowerCase();
  const name = text(form, "name", 120);
  const role = text(form, "role") as Role;
  const password = String(form.get("password") ?? "");
  if (!EMAIL.test(email)) return { error: "Enter a valid email." };
  if (!name) return { error: "Name is required." };
  if (!ROLES.includes(role)) return { error: "Choose a role." };
  if (password.length < 10) return { error: "The initial password must have at least 10 characters." };
  if (await one("select 1 from users where email = $1", [email])) return { error: "A user with this email already exists." };
  const user = await one<{ id: string }>(
    "insert into users (email, name, role, password_hash) values ($1, $2, $3, $4) returning id",
    [email, name, role, await bcrypt.hash(password, 12)]
  );
  await audit(admin.id, "create", "user", user!.id, { email, role });
  revalidatePath("/admin/users");
  return { ok: `${name} can now sign in as ${email}. Share the initial password securely and ask them to change it.` };
}

export async function updateUser(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireUser("admin");
  const id = text(form, "id");
  const role = text(form, "role") as Role;
  const active = form.get("active") === "on";
  const name = text(form, "name", 120);
  if (!ROLES.includes(role)) return { error: "Choose a role." };
  if (!name) return { error: "Name is required." };
  const target = await one<{ role: Role; active: boolean }>("select role, active from users where id = $1", [id]);
  if (!target) return { error: "User not found." };
  const losesAdmin = target.role === "admin" && target.active && (role !== "admin" || !active);
  if (losesAdmin && (await otherActiveAdmins(id)) === 0) return { error: "At least one active administrator must remain." };
  if (id === admin.id && !active) return { error: "You cannot deactivate your own account." };
  await one("update users set name = $2, role = $3, active = $4 where id = $1", [id, name, role, active]);
  await audit(admin.id, "update", "user", id, { role, active });
  revalidatePath("/admin/users");
  return { ok: "User updated." };
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireUser("admin");
  const id = text(form, "id");
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "The new password must have at least 10 characters." };
  const user = await one<{ email: string }>("update users set password_hash = $2 where id = $1 returning email", [id, await bcrypt.hash(password, 12)]);
  if (!user) return { error: "User not found." };
  await audit(admin.id, "reset_password", "user", id);
  return { ok: `Password for ${user.email} was reset.` };
}
