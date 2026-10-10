import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { env } from "./env";
import { ADMIN_COOKIE, SESSION_TTL_SECONDS, signAdminToken, verifyAdminToken } from "./session-token";

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 12) return "Password must be at least 12 characters.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password))
    return "Password must include upper-case, lower-case letters and a number.";
  return null;
}

// A real hash so failed lookups take the same time as wrong passwords (no user enumeration by timing).
const DUMMY_HASH = "$2b$12$JsJ68o88MFgQ/RbEvsVPH.3Ntx5J1j6/jbEF1jAShAa4mwk.ps46q";

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function attemptLogin(emailRaw: string, password: string): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  const user = await db.adminUser.findUnique({ where: { email } });
  const generic: LoginResult = { ok: false, error: "Invalid email or password." };

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    return generic;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, error: "Too many failed attempts. Try again later." };
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const failed = user.failedLoginCount + 1;
    await db.adminUser.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failed >= MAX_FAILED_LOGINS ? 0 : failed,
        lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
      },
    });
    return generic;
  }
  await db.adminUser.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  const token = await signAdminToken({ sub: user.id, v: user.sessionVersion }, env.authSecret());
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** Returns the signed-in admin, re-checking the database on every call (revocation, deleted users). */
export async function getAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const claims = await verifyAdminToken(token, env.authSecret());
  if (!claims) return null;
  const user = await db.adminUser.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, sessionVersion: true },
  });
  if (!user || user.sessionVersion !== claims.v) return null;
  return user;
}

/** Use at the top of every admin page, server action and admin API route. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** For API routes: returns null instead of redirecting. Also rejects cross-origin requests. */
export async function requireAdminApi() {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (origin && host && new URL(origin).host !== host) return null;
  return getAdmin();
}
