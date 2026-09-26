import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getPathLiveness } from "@/lib/mediamtx-api";

/**
 * GET /api/health - intentionally public (no session): systemd, LAN checks
 * and future monitoring need it without credentials. Returns 503 when the
 * database is unreachable. Exposes no secrets or row data.
 */
export async function GET() {
  let db = false;
  try {
    await pool.query("SELECT 1");
    db = true;
  } catch (error) {
    console.error("Health check: database unreachable:", error);
  }

  const mediamtx = await getPathLiveness();

  const body = {
    ok: db,
    db,
    mediamtx: {
      configured: mediamtx.configured,
      reachable: mediamtx.reachable,
    },
    uptimeSec: Math.round(process.uptime()),
  };

  return NextResponse.json(body, { status: db ? 200 : 503 });
}
