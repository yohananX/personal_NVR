import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getPathLiveness } from "@/lib/mediamtx-api";

/** GET /api/mediamtx/status - per-path liveness for the dashboard. */
export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  return NextResponse.json(await getPathLiveness());
}
