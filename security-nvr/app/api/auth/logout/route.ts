import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import pool from "@/lib/db";
import { SESSION_COOKIE, clearSessionCookieHeader } from "@/lib/auth";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    await pool.query("DELETE FROM sessions WHERE token_hash = $1", [
      tokenHash,
    ]);
  }
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearSessionCookieHeader());
  return response;
}
