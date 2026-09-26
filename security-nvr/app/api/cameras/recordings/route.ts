import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const cameraId = searchParams.get("cameraId");

  try {
    const result = cameraId
      ? await pool.query(
          `
            SELECT
              id,
              camera_id,
              file_path,
              started_at,
              ended_at,
              created_at
            FROM recordings
            WHERE camera_id = $1
            ORDER BY started_at DESC
          `,
          [cameraId]
        )
      : await pool.query(
          `
            SELECT
              id,
              camera_id,
              file_path,
              started_at,
              ended_at,
              created_at
            FROM recordings
            ORDER BY started_at DESC
          `
        );

    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    console.error("Failed to fetch recordings:", error);

    return NextResponse.json(
      { error: "Failed to fetch recordings." },
      { status: 500 }
    );
  }
}