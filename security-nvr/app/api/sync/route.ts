import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { syncRecordings } from "@/lib/recordings-sync";

/**
 * POST /api/sync - run recording discovery.
 * Accepts EITHER a machine caller (systemd timer / MediaMTX webhook with
 * SYNC_SECRET) OR a logged-in ADMIN (Sync now button). GET health stays open.
 */
export async function POST(request: Request) {
  const secret = process.env.SYNC_SECRET?.trim();
  const url = new URL(request.url);
  const given =
    request.headers.get("x-sync-secret") ??
    url.searchParams.get("secret");
  const hasMachineSecret = Boolean(secret && given && given === secret);

  if (!hasMachineSecret) {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      );
    }
  }

  try {
    const result = await syncRecordings();
    return NextResponse.json({
      ...result,
      warning: secret
        ? undefined
        : "SYNC_SECRET is not set - endpoint is open (dev only).",
    });
  } catch (error: unknown) {
    console.error("Recording sync failed:", error);
    return NextResponse.json(
      { error: "Recording sync failed." },
      { status: 500 }
    );
  }
}

/** GET /api/sync - health without touching disk or DB writes. */
export async function GET() {
  return NextResponse.json({
    configured: Boolean(
      (
        process.env.RECORDINGS_DIR ??
        process.env.NEXT_PUBLIC_RECORDINGS_DIR ??
        ""
      ).trim()
    ),
    hasSecret: Boolean(process.env.SYNC_SECRET?.trim()),
  });
}
