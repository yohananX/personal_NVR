-- 001: initial NVR schema (fresh-deploy baseline).
-- Creates the cameras + recordings tables. Later migrations only add
-- constraints/indexes that belong to their stage:
--   002_recordings_sync.sql -> uniqueness + sync lookup index
--   003_auth.sql            -> users + sessions
-- Apply in order on a fresh database:
--   psql "$DATABASE_URL" -f db/migrations/001_recordings.sql
--   psql "$DATABASE_URL" -f db/migrations/002_recordings_sync.sql
--   psql "$DATABASE_URL" -f db/migrations/003_auth.sql
-- Or: npm run migrate -- db/migrations/001_recordings.sql (repeat per file)

-- Cameras: `path` is the MediaMTX path name (e.g. stairs1), NOT the
-- camera's RTSP URL. MediaMTX maps path -> rtsp://... source.
CREATE TABLE IF NOT EXISTS cameras (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recordings: one row per MediaMTX segment file, discovered by
-- POST /api/sync (see lib/recordings-sync.ts). file_path is the
-- posix-relative path under RECORDINGS_DIR, e.g.
-- stairs1/2026-09-26_10-00-00-000000.mp4
CREATE TABLE IF NOT EXISTS recordings (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recordings_camera_id_idx
    ON recordings(camera_id);

CREATE INDEX IF NOT EXISTS recordings_started_at_idx
    ON recordings(started_at);
