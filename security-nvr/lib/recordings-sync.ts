import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import pool from "@/lib/db";

/**
 * What: filesystem discovery of MediaMTX recording segments.
 * Why: MediaMTX writes the files; the NVR must not require hand-inserted rows.
 * NVR fit: Next.js + MediaMTX share host `ghis`, so a local dir scan is the
 *   simplest reliable mechanism - no polling every second, no extra service.
 *   Triggered every few minutes (systemd timer) + optional
 *   `runOnRecordSegmentComplete` webhook, both hitting POST /api/sync.
 *
 * Mapping: camera DB `path` -> RECORDINGS_DIR/<path>/*.mp4
 *   start = filename timestamp (%Y-%m-%d_%H-%M-%S-%f, server local time)
 *   end   = file mtime (completed 1h segment ~= start+1h, in-progress ~= now)
 *   file_path = relative posix path, e.g. stairs1/2026-09-26_10-00-00-000000.mp4
 */

export type SyncResult = {
  skipped: boolean;
  reason?: string;
  cameras: number;
  scanned: number;
  upserted: number;
  pruned: number;
  warning?: string;
};

const SEGMENT_RE =
  /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})-(\d+)\.mp4$/;

export function parseSegmentStart(
  fileName: string
): Date | null {
  const m = SEGMENT_RE.exec(fileName);
  if (!m) return null;
  const [, Y, Mo, D, H, Mi, S, F] = m;
  const ms = Number(F.slice(0, 3).padEnd(3, "0"));
  const d = new Date(
    Number(Y),
    Number(Mo) - 1,
    Number(D),
    Number(H),
    Number(Mi),
    Number(S),
    Number.isNaN(ms) ? 0 : ms
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getRecordingsDir(): string | null {
  const dir =
    process.env.RECORDINGS_DIR?.trim() ||
    process.env.NEXT_PUBLIC_RECORDINGS_DIR?.trim();
  return dir ? dir : null;
}

async function walkMp4(
  dir: string,
  base: string,
  depth: number,
  out: string[]
): Promise<void> {
  if (depth > 3) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walkMp4(full, base, depth + 1, out);
    } else if (e.isFile() && e.name.endsWith(".mp4")) {
      out.push(path.relative(base, full).split(path.sep).join("/"));
    }
  }
}

export async function syncRecordings(): Promise<SyncResult> {
  const dir = getRecordingsDir();

  if (!dir) {
    return {
      skipped: true,
      reason: "RECORDINGS_DIR is not set (dev PC placeholder).",
      cameras: 0,
      scanned: 0,
      upserted: 0,
      pruned: 0,
    };
  }

  try {
    await stat(dir);
  } catch {
    return {
      skipped: true,
      reason: `RECORDINGS_DIR does not exist: ${dir}`,
      cameras: 0,
      scanned: 0,
      upserted: 0,
      pruned: 0,
    };
  }

  const cameras = (
    await pool.query("SELECT id, path FROM cameras")
  ).rows as { id: number; path: string }[];

  let scanned = 0;
  let upserted = 0;
  let pruned = 0;

  for (const camera of cameras) {
    const clean = camera.path.trim().replace(/^\/+/, "");
    const found: {
      filePath: string;
      startedAt: Date;
      endedAt: Date;
    }[] = [];
    const relFiles: string[] = [];
    await walkMp4(path.join(dir, clean), path.join(dir, clean), 0, relFiles);

    for (const rel of relFiles) {
      const fileName = rel.split("/").pop() ?? "";
      const startedAt = parseSegmentStart(fileName);
      if (!startedAt) continue;
      let endedAt: Date;
      try {
        const st = await stat(path.join(dir, clean, ...rel.split("/")));
        endedAt = st.mtime;
        if (endedAt.getTime() < startedAt.getTime()) {
          endedAt = startedAt;
        }
      } catch {
        continue;
      }
      scanned++;
      found.push({
        filePath: `${clean}/${rel}`,
        startedAt,
        endedAt,
      });
    }

    for (const f of found) {
      const r = await pool.query(
        `
          INSERT INTO recordings (camera_id, file_path, started_at, ended_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (camera_id, file_path)
          DO UPDATE SET ended_at = EXCLUDED.ended_at
          RETURNING (xmax = 0) AS inserted
        `,
        [camera.id, f.filePath, f.startedAt, f.endedAt]
      );
      if (r.rows[0]?.inserted) upserted++;
    }

    // Prune rows whose segment file is gone (MediaMTX ~1d retention).
    // Only runs after a successful scan of this camera's directory.
    const keep = found.map((f) => f.filePath);
    const del = await pool.query(
      `
        DELETE FROM recordings
        WHERE camera_id = $1
          AND NOT (file_path = ANY ($2))
      `,
      [camera.id, keep]
    );
    pruned += del.rowCount ?? 0;
  }

  return {
    skipped: false,
    cameras: cameras.length,
    scanned,
    upserted,
    pruned,
  };
}
