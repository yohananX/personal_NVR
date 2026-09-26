import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  const result = await pool.query(
    "SELECT id, name, path, created_at FROM cameras ORDER BY id ASC"
  );

  return NextResponse.json(result.rows);
}

export async function POST(request: Request) {
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