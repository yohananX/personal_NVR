-- Stage 6: authentication. Stateful sessions, instant revoke via DELETE.
-- No credentials are seeded here - create users with:
--   npm run user:create -- --username admin --role ADMIN
-- Apply: psql "$DATABASE_URL" -f db/migrations/003_auth.sql

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'OPERATOR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx
  ON sessions (user_id);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx
  ON sessions (expires_at);
