import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { one } from "./db";
import { atLeast, type Role } from "./roles";

const COOKIE = "gp_session";
const MAX_AGE = 60 * 60 * 12; // 12 hours

export type SessionUser = { id: string; email: string; name: string; role: Role };

let fallbackSecret: Uint8Array | undefined;

export function sessionSecretConfigured() {
  return (process.env.SESSION_SECRET ?? "").length >= 32;
}

function secret() {
  if (sessionSecretConfigured()) return new TextEncoder().encode(process.env.SESSION_SECRET);
  // Without a configured secret, keep the platform usable with a per-process random key:
  // sessions then end whenever the server restarts. Settings shows a warning until it is set.
  if (!fallbackSecret) {
    console.warn("[session] SESSION_SECRET is missing or shorter than 32 characters; using a temporary key.");
    fallbackSecret = new Uint8Array(randomBytes(32));
  }
  return fallbackSecret;
}

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Current user, re-read from the database so deactivation and role changes apply immediately. */
export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return await one<SessionUser>(
      "select id, email, name, role from users where id = $1 and active",
      [payload.sub]
    );
  } catch {
    return null;
  }
}

/** For pages and server actions: redirects to login, or to the dashboard when the role is insufficient. */
export async function requireUser(required: Role = "viewer"): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!atLeast(user.role, required)) redirect("/?denied=1");
  return user;
}
