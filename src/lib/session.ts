import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { one } from "./db";
import { atLeast, type Role } from "./roles";

const COOKIE = "gp_session";
const MAX_AGE = 60 * 60 * 12; // 12 hours

export type SessionUser = { id: string; email: string; name: string; role: Role };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (min 32 characters)");
    return new TextEncoder().encode("dev-only-insecure-session-secret-change-me");
  }
  return new TextEncoder().encode(value);
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
