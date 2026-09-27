import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import pool from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getRecordingsDir } from "@/lib/recordings-sync";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

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

/**
 * DELETE /api/recordings/:id - ADMIN only. Deletes BOTH the segment file
 * under RECORDINGS_DIR and the PostgreSQL row, keeping the two systems
 * consistent. A missing file is not fatal (retention may have pruned it):
 * the row is still removed so no stale entry remains.
 */
export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  const auth = await requireApiUser(["ADMIN"]);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;

  try {
    const found = await pool.query(
      "SELECT id, file_path FROM recordings WHERE id = $1",
      [id]
    );
    if (found.rows.length === 0) {
      return NextResponse.json(
        { error: "Recording not found." },
        { status: 404 }
      );
    }
    const filePath: string = found.rows[0].file_path;

    const dir = getRecordingsDir();
    if (!dir) {
      return NextResponse.json(
        { error: "RECORDINGS_DIR is not configured." },
        { status: 500 }
      );
    }

    // Contain the delete inside RECORDINGS_DIR (no path traversal).
    const base = path.resolve(dir);
    const full = path.resolve(base, ...filePath.split("/"));
    if (full !== base && !full.startsWith(base + path.sep)) {
      return NextResponse.json(
        { error: "Recording path is outside RECORDINGS_DIR." },
        { status: 400 }
      );
    }

    try {
      await unlink(full);
    } catch (error: unknown) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code)
          : "";
      if (code !== "ENOENT") {
        console.error("Failed to delete recording file:", error);
        return NextResponse.json(
          { error: "Failed to delete recording file." },
          { status: 500 }
        );
      }
      // ENOENT: retention already removed the file - still drop the row.
    }

    await pool.query("DELETE FROM recordings WHERE id = $1", [id]);
    return NextResponse.json({ message: "Recording deleted." });
  } catch (error: unknown) {
    console.error("Failed to delete recording:", error);
    return NextResponse.json(
      { error: "Failed to delete recording." },
      { status: 500 }
    );
  }
}