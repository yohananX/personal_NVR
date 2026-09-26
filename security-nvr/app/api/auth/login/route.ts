import { NextResponse } from "next/server";
import pool from "@/lib/db";
import {
  createSession,
  sessionCookieHeader,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }

  const { username, password } =
    (body as { username?: unknown; password?: unknown }) ?? {};

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !username.trim() ||
    !password
  ) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  const result = await pool.query(
    "SELECT id, username, password_hash, role FROM users WHERE username = $1",
    [username.trim()]
  );

  const row = result.rows[0];
  // Generic message either way - never reveal which field was wrong.
  if (!row || !verifyPassword(password, row.password_hash)) {
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  const { token, expiresAt } = await createSession(row.id);
  const response = NextResponse.json({
    ok: true,
    username: row.username,
    role: row.role,
  });
  response.headers.set(
    "Set-Cookie",
    sessionCookieHeader(token, expiresAt)
  );
  return response;
}
