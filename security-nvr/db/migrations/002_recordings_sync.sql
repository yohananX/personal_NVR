-- Stage 5: recording discovery owns the recordings table going forward.
-- One row per segment file. Re-running sync must not create duplicates,
-- and rows for deleted/expired segments are pruned by file_path.
-- Apply on ghis: psql "$DATABASE_URL" -f db/migrations/002_recordings_sync.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recordings_camera_file_unique'
  ) THEN
    ALTER TABLE recordings
      ADD CONSTRAINT recordings_camera_file_unique
      UNIQUE (camera_id, file_path);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS recordings_camera_started_idx
  ON recordings (camera_id, started_at DESC);
