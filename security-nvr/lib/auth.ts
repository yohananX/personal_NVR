import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import pool from "@/lib/db";

/**
 * What: password hashing (scrypt) + stateful Postgres sessions.
 * Why: zero new dependencies, instant logout/revoke, fits the pg stack.
 * NVR fit: ADMIN manages cameras/users, OPERATOR views. LAN-only server,
 *   so a single httpOnly session cookie is the whole mechanism.
 */

export const SESSION_COOKIE = "nvr_session";
export const SESSION_TTL_DAYS = 7;

export type Role = "ADMIN" | "OPERATOR";

export type SessionUser = {
  id: number;
  username: string;
  role: Role;
};

function scryptParams() {
  return { N: 16384, r: 8, p: 1, keyLen: 64 };
}

export function hashPassword(password: string): string {
  const { N, r, p, keyLen } = scryptParams();
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(password, salt, keyLen, { N, r, p })
    .toString("hex");
  return `scrypt$${N}$${r}$${p}$${salt}$${hash}`;
}

export function verifyPassword(
  password: string,
  stored: string
): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, Ns, rs, ps, salt, hashHex] = parts;
  const N = Number(Ns);
  const r = Number(rs);
  const p = Number(ps);
  if (!N || !r || !p || !salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length, {
    N,
    r,
    p,
  });
  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual)
  );
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: number
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000
  );
  await pool.query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
    [hashToken(token), userId, expiresAt]
  );
  return { token, expiresAt };
}

export function sessionCookieHeader(
  token: string,
  expiresAt: Date
): string {
  const secure =
    process.env.NODE_ENV === "production" ? "; Secure" : "";
  return (
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax` +
    `${secure}; Expires=${expiresAt.toUTCString()}`
  );
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const result = await pool.query(
    `
      SELECT u.id, u.username, u.role, s.expires_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
    `,
    [hashToken(token)]
  );

  const row = result.rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.query("DELETE FROM sessions WHERE token_hash = $1", [
      hashToken(token),
    ]);
    return null;
  }

  // Sliding refresh past the halfway mark - cheap, keeps NVR logged in.
  const ttlMs = SESSION_TTL_DAYS * 24 * 3600 * 1000;
  if (new Date(row.expires_at).getTime() - Date.now() < ttlMs / 2) {
    await pool.query(
      "UPDATE sessions SET expires_at = $1 WHERE token_hash = $2",
      [new Date(Date.now() + ttlMs), hashToken(token)]
    );
  }

  return { id: row.id, username: row.username, role: row.role };
}

/** Pages: call first - redirects anonymous visitors to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * APIs: returns the user or a 401/403 JSON response.
 * Pass roles=["ADMIN"] for management endpoints.
 */
export async function requireApiUser(
  roles?: Role[]
): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = await getSessionUser();
  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      ),
    };
  }
  if (roles && !roles.includes(user.role)) {
    return {
      response: NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      ),
    };
  }
  return { user };
}
