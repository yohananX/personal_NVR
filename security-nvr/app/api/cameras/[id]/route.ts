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

  const result = await pool.query(
    `
      SELECT id, name, path, created_at
      FROM cameras
      WHERE id = $1
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: "Camera not found." },
      { status: 404 }
    );
  }

  return NextResponse.json(result.rows[0]);
}

export async function PUT(
  request: Request,
  context: RouteContext
) {
  const { id } = await context.params;
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
        UPDATE cameras
        SET name = $1, path = $2
        WHERE id = $3
        RETURNING id, name, path, created_at
      `,
      [body.name.trim(), body.path.trim(), id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Camera not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    console.error("Failed to update camera:", error);

    return NextResponse.json(
      { error: "Failed to update camera." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  try {
    const result = await pool.query(
      `
        DELETE FROM cameras
        WHERE id = $1
        RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Camera not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Camera deleted successfully.",
    });
  } catch (error: unknown) {
    console.error("Failed to delete camera:", error);

    return NextResponse.json(
      { error: "Failed to delete camera." },
      { status: 500 }
    );
  }
}