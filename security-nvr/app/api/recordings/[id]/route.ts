import { NextResponse } from "next/server";
import pool from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  try {
    const result = await pool.query(
      `
        SELECT
          r.id,
          r.camera_id,
          r.file_path,
          r.started_at,
          r.ended_at,
          r.created_at,
          c.name AS camera_name,
          c.path AS camera_path
        FROM recordings r
        JOIN cameras c
          ON c.id = r.camera_id
        WHERE r.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Recording not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    console.error("Failed to fetch recording:", error);

    return NextResponse.json(
      { error: "Failed to fetch recording." },
      { status: 500 }
    );
  }
}