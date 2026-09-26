-- Production database bootstrap for ghis.
-- Run ONCE as superuser:  sudo -u postgres psql -f deploy/db-init.sql
-- Replace CHANGE_ME_* before running. Never commit real passwords.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nvr_app') THEN
    CREATE ROLE nvr_app WITH LOGIN PASSWORD 'CHANGE_ME_DB_PASSWORD';
  END IF;
END
$$;

SELECT 'CREATE DATABASE security_nvr OWNER nvr_app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'security_nvr')
\gexec

\c security_nvr

GRANT CREATE ON SCHEMA public TO nvr_app;
