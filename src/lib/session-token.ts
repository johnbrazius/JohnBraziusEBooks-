/**
 * Edge-safe JWT helpers (used by middleware and server code). No database or Node APIs here.
 */
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "wgl_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function key(secret: string) {
  return new TextEncoder().encode(secret);
}

export type AdminClaims = { sub: string; v: number };

export async function signAdminToken(claims: AdminClaims, secret: string): Promise<string> {
  return new SignJWT({ v: claims.v })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setAudience("wgl-admin")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key(secret));
}

export async function verifyAdminToken(token: string | undefined, secret: string): Promise<AdminClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { audience: "wgl-admin", algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.v !== "number") return null;
    return { sub: payload.sub, v: payload.v };
  } catch {
    return null;
  }
}

/** Short-lived signed tickets, e.g. authorising a single file upload to a specific storage path. */
export async function signTicket(data: Record<string, unknown>, secret: string, ttlSeconds: number, aud: string) {
  return new SignJWT(data).setProtectedHeader({ alg: "HS256" }).setAudience(aud).setIssuedAt().setExpirationTime(`${ttlSeconds}s`).sign(key(secret));
}

export async function verifyTicket<T>(token: string, secret: string, aud: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { audience: aud, algorithms: ["HS256"] });
    return payload as T;
  } catch {
    return null;
  }
}
