"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { one, query } from "@/lib/db";
import { createSession, destroySession, getUser } from "@/lib/session";

// Simple in-process throttle: 5 failed attempts per email per 15 minutes.
const failures = new Map<string, { count: number; until: number }>();
const WINDOW = 15 * 60_000;

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  if (!email || !password) return { error: "Enter your email and password." };

  const entry = failures.get(email);
  if (entry && entry.count >= 5 && entry.until > Date.now()) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const user = await one<{ id: string; password_hash: string; active: boolean }>(
    "select id, password_hash, active from users where email = $1",
    [email]
  );
  const ok = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!user || !ok || !user.active) {
    const next = entry && entry.until > Date.now() ? entry.count + 1 : 1;
    failures.set(email, { count: next, until: Date.now() + WINDOW });
    return { error: user && ok && !user.active ? "This account is deactivated." : "Email or password is incorrect." };
  }

  failures.delete(email);
  await query("update users set last_login_at = now() where id = $1", [user.id]);
  await audit(user.id, "login", "user", user.id);
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  const user = await getUser();
  if (user) await audit(user.id, "logout", "user", user.id);
  await destroySession();
  redirect("/login");
}
