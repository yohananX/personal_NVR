import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const result = await pool.query(
    `
      SELECT
        c.id,
        c.name,
        c.path,
        c.created_at,
        MAX(r.started_at) AS last_recording_at,
        COUNT(r.id) FILTER (
          WHERE r.started_at > NOW() - INTERVAL '24 hours'
        ) AS recordings_24h
      FROM cameras c
      LEFT JOIN recordings r ON r.camera_id = c.id
      GROUP BY c.id
      ORDER BY c.id ASC
    `
  );

  return NextResponse.json(
    result.rows.map((row) => ({
      ...row,
      recordings_24h: Number(row.recordings_24h ?? 0),
    }))
  );
}

export async function POST(request: Request) {
  const auth = await requireApiUser(["ADMIN"]);
  if ("response" in auth) return auth.response;

  const body = await request.json();

  if (
    typeof body.name !== "string" ||
    typeof body.path !== "string" ||
    body.name.trim() === "" ||
    body.path.trim() === ""
  ) {
    return NextResponse.json(
      { error: "Name and path are required." },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO cameras (name, path)
        VALUES ($1, $2)
        RETURNING id, name, path, created_at
      `,
      [body.name.trim(), body.path.trim()]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create camera:", error);

    return NextResponse.json(
      { error: "Failed to create camera." },
      { status: 500 }
    );
  }
}