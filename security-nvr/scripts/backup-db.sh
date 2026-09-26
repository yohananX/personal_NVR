#!/usr/bin/env bash
# Nightly PostgreSQL backup for the NVR. Reads DATABASE_URL from .env.local
# next to this script. Keeps 7 days in /var/backups/nvr.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="/var/backups/nvr"
KEEP_DAYS=7

if [ -f "$APP_DIR/.env.local" ]; then
  # shellcheck disable=SC1091
  set -a; . "$APP_DIR/.env.local"; set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "backup-db: DATABASE_URL is not set" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d_%H%M)"
OUT="$BACKUP_DIR/security_nvr-$STAMP.dump"

pg_dump -Fc -f "$OUT" "$DATABASE_URL"
find "$BACKUP_DIR" -name 'security_nvr-*.dump' -mtime +"$KEEP_DAYS" -delete

echo "backup-db: wrote $OUT"
