import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

/**
 * GET /api/recordings?cameraId=&date=YYYY-MM-DD&from=HH:MM&to=HH:MM&page=&limit=
 * date bounds are server-local days; from/to narrow within that day.
 * Times without a date are ignored. Response is an envelope:
 *   { items, total, page, limit }
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const cameraId = searchParams.get("cameraId");
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(
    1,
    Number.parseInt(searchParams.get("page") ?? "1", 10) || 1
  );
  const limit = Math.min(
    200,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "50", 10) || 50)
  );

  if (date !== null && !DATE_RE.test(date)) {
    return NextResponse.json(
      { error: "Invalid date. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }
  if (
    (from !== null && !TIME_RE.test(from)) ||
    (to !== null && !TIME_RE.test(to))
  ) {
    return NextResponse.json(
      { error: "Invalid time. Use HH:MM." },
      { status: 400 }
    );
  }

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (cameraId) {
    values.push(cameraId);
    conditions.push(`camera_id = $${values.length}`);
  }

  if (date) {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    if (Number.isNaN(dayStart.getTime())) {
      return NextResponse.json(
        { error: "Invalid date." },
        { status: 400 }
      );
    }
    let lower = dayStart;
    let upper = dayEnd;
    if (from) lower = new Date(`${date}T${from}:00`);
    if (to) upper = new Date(`${date}T${to}:00`);
    if (upper.getTime() <= lower.getTime()) {
      return NextResponse.json(
        { error: "Time range end must be after start." },
        { status: 400 }
      );
    }
    values.push(lower.toISOString());
    conditions.push(`started_at >= $${values.length}`);
    values.push(upper.toISOString());
    conditions.push(`started_at < $${values.length}`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM recordings ${where}`,
      values
    );
    const total = Number(countResult.rows[0].total);

    const offset = (page - 1) * limit;
    const result = await pool.query(
      `
        SELECT
          id,
          camera_id,
          file_path,
          started_at,
          ended_at,
          created_at
        FROM recordings
        ${where}
        ORDER BY started_at DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `,
      [...values, limit, offset]
    );

    return NextResponse.json({
      items: result.rows,
      total,
      page,
      limit,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch recordings:", error);

    return NextResponse.json(
      { error: "Failed to fetch recordings." },
      { status: 500 }
    );
  }
}
