# Deploy to `ghis` (192.168.0.146)

Target: browsers on the LAN open `http://192.168.0.146:3000` and get the NVR,
backed by local PostgreSQL and MediaMTX. No Docker (low RAM).

## Installation-path standard (read this first)

The supported installation path is:

```text
/opt/personal_NVR
App:      /opt/personal_NVR/security-nvr
Secrets:  /opt/personal_NVR/security-nvr/.env.local (mode 600, never in git)
Service user: nvr
```

All systemd units (`deploy/*.service`) use:

```text
User=nvr
WorkingDirectory=/opt/personal_NVR/security-nvr
EnvironmentFile=/opt/personal_NVR/security-nvr/.env.local
```

An older manual deployment ran from `/home/ghis/personal_NVR`, which made
`nvr-nextjs.service` fail after reboot (missing working directory and
`.env.local`). That layout is **not supported**. If you previously cloned
under `/home/ghis`, either move the checkout to `/opt/personal_NVR` or update
every `WorkingDirectory` / `EnvironmentFile` / `ExecStart` path in
`deploy/*.service` before installing them.

All commands run **on `ghis`** unless noted.

## 0. Prerequisites on ghis

| Requirement | Check / install |
|---|---|
| Node.js 22 LTS | `curl -fsSL https://deb.nodesource.com/setup_22.x \| sudo -E bash -` then `sudo apt install -y nodejs` |
| npm | ships with Node.js (`npm --version`) |
| PostgreSQL server + client | `sudo apt install -y postgresql postgresql-client`, then `sudo -u postgres psql -c 'SELECT version();'` |
| MediaMTX | already running as `mediamtx.service` (see section 6) |
| Git | `sudo apt install -y git` |
| curl, openssl | `sudo apt install -y curl openssl` (needed for health checks + secret generation) |

```bash
node --version   # want v22.x
sudo -u postgres psql -c 'SELECT version();'  # postgres server must exist
git --version
```

## 1. Clone + install

```bash
sudo mkdir -p /opt && sudo chown "$USER" /opt
git clone https://github.com/yohananX/personal_NVR.git /opt/personal_NVR
cd /opt/personal_NVR/security-nvr
npm ci
```

## 2. Database

```bash
# edit deploy/db-init.sql first: replace CHANGE_ME_DB_PASSWORD
sudo -u postgres psql -f deploy/db-init.sql

# Run migrations IN ORDER on a fresh database (001 is the baseline;
# 002 only adds the sync uniqueness constraint + lookup index).
psql "$DATABASE_URL" -f db/migrations/001_recordings.sql
psql "$DATABASE_URL" -f db/migrations/002_recordings_sync.sql
psql "$DATABASE_URL" -f db/migrations/003_auth.sql
# ...or per file: npm run migrate -- db/migrations/001_recordings.sql

# least-privilege: the app owns its objects, nothing more
sudo -u postgres psql -d security_nvr -c 'ALTER TABLE cameras OWNER TO nvr_app;'
sudo -u postgres psql -d security_nvr -c 'ALTER TABLE recordings OWNER TO nvr_app;'
sudo -u postgres psql -d security_nvr -c 'ALTER TABLE users OWNER TO nvr_app;'
sudo -u postgres psql -d security_nvr -c 'ALTER TABLE sessions OWNER TO nvr_app;'
```

Final schema: `cameras`, `recordings`, `users`, `sessions`.

## 3. Environment

```bash
cp .env.example .env.local
nano .env.local
chmod 600 .env.local
```

Production values:

```bash
DATABASE_URL=postgresql://nvr_app:<db-password>@127.0.0.1:5432/security_nvr
NEXT_PUBLIC_MEDIAMTX_BASE=http://192.168.0.146:8889
NEXT_PUBLIC_MEDIAMTX_PLAYBACK_BASE=http://192.168.0.146:9996
RECORDINGS_DIR=/srv/mediamtx/recordings
SYNC_SECRET=<output of: openssl rand -hex 32>
MEDIAMTX_API_BASE=http://127.0.0.1:9997
# HTTP LAN deployment: Secure cookies are rejected over plain HTTP.
AUTH_COOKIE_SECURE=false
# When HTTPS is introduced, set AUTH_COOKIE_SECURE=true.
```

See `.env.example` for what each variable does. `chmod 600 .env.local`.
This file is never committed (see `security-nvr/.gitignore`).

## 4. Migrate + first admin + build

```bash
npm run migrate -- db/migrations/001_recordings.sql
npm run migrate -- db/migrations/002_recordings_sync.sql
npm run migrate -- db/migrations/003_auth.sql
npm run user:create -- --username admin --role ADMIN --password '<secret>'
npm run build
curl -s http://127.0.0.1:3000/api/health || true  # app not running yet; skip if refused
```

## 5. systemd: Next.js + timers

```bash
sudo useradd --system --home /opt/personal_NVR --shell /usr/sbin/nologin nvr || true
sudo chown -R nvr:nvr /opt/personal_NVR
# nvr needs to read recordings + write nothing there; sync only reads:
sudo usermod -aG mediamtx nvr 2>/dev/null || true
# if /srv/mediamtx/recordings is not group-readable:
#   sudo chmod g+rx /srv/mediamtx/recordings

sudo cp deploy/nvr-nextjs.service /etc/systemd/system/
sudo cp deploy/nvr-sync.service deploy/nvr-sync.timer /etc/systemd/system/
sudo cp deploy/nvr-backup.service deploy/nvr-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nvr-nextjs.service
sudo systemctl enable --now nvr-sync.timer
sudo systemctl enable --now nvr-backup.timer
```

Units installed:

```text
nvr-nextjs.service  Next.js app (port 3000, LAN)
nvr-sync.service    recording discovery, one shot (triggered by timer/webhook)
nvr-sync.timer      every 5 minutes (+2 min after boot)
nvr-backup.service  pg_dump, one shot (triggered by timer)
nvr-backup.timer    daily 03:00
mediamtx.service    MediaMTX (RTSP ingest, WebRTC, recording, playback)
```

Backups need a dump tool + target dir:

```bash
sudo mkdir -p /var/backups/nvr && sudo chown nvr:nvr /var/backups/nvr
chmod +x /opt/personal_NVR/security-nvr/scripts/backup-db.sh
```

## 6. MediaMTX

Merge `deploy/mediamtx-ghis-snippet.yml` into `/usr/local/etc/mediamtx.yml`
( keys only — keep the rest of the running config). Replace `YOUR_SYNC_SECRET`
with the `SYNC_SECRET` from `.env.local`, then:

```bash
sudo systemctl restart mediamtx
```

Recording model: MediaMTX records **continuously** (`record: yes`, 1h fmp4
segments, ~24h retention). The NVR never captures video in the browser and
never proxies RTSP — it discovers segment files via `POST /api/sync` and
plays them back through the MediaMTX playback server (`:9996/get`).

## 7. Verify (on ghis, then from a LAN browser)

```bash
curl -s http://127.0.0.1:3000/api/health
# {"ok":true,"db":true,"mediamtx":{"configured":true,"reachable":true},...}

systemctl is-active nvr-nextjs
systemctl is-active mediamtx
systemctl list-timers nvr-sync.timer nvr-backup.timer
sudo journalctl -u nvr-nextjs --since '10 min ago' --no-pager | tail -20
```

From a PC on the LAN: open `http://192.168.0.146:3000`, log in as admin,
open a camera (live should connect), open a recording (video should play),
check `/recordings` shows fresh segments after a few minutes.

## 8. Reboot verification (required after any service change)

```text
sudo reboot
  ↓ services restart (nvr-nextjs, mediamtx, timers)
  ↓ NVR accessible at http://192.168.0.146:3000
  ↓ authentication works (login as admin)
  ↓ MediaMTX reachable (dashboard shows live counts, not "unreachable")
  ↓ camera streams work (live video connects without a manual Play click)
  ↓ recordings continue (new segments appear in /recordings after ~1h,
      or run POST /api/sync and confirm `scanned`/`upserted`)
```

Re-run the full section-7 verify block after the reboot.

## Operations

```bash
# start / stop / restart
sudo systemctl restart nvr-nextjs
sudo systemctl stop nvr-nextjs

# logs
sudo journalctl -u nvr-nextjs -f
sudo journalctl -u nvr-sync.service --no-pager | tail -20

# run discovery now (machine path)
curl -X POST -H "x-sync-secret: $SYNC_SECRET" http://127.0.0.1:3000/api/sync

# update to a new release
cd /opt/personal_NVR && git pull
cd security-nvr && npm ci && npm run build
sudo systemctl restart nvr-nextjs

# restore DB from a backup (stops the app first)
sudo systemctl stop nvr-nextjs
pg_restore -c -d "$DATABASE_URL" /var/backups/nvr/security_nvr-<stamp>.dump
sudo systemctl start nvr-nextjs
```

## Where things live on ghis

| What | Where |
|---|---|
| App | `/opt/personal_NVR/security-nvr` |
| Secrets | `.env.local` (mode 600, never in git) |
| Recordings | `/srv/mediamtx/recordings` (retention ~24h) |
| DB backups | `/var/backups/nvr` (7 days) |
| Logs | `journalctl -u nvr-nextjs` |

## Camera ops

- Add camera: UI as ADMIN, or `INSERT INTO cameras (name, path) …`; `path` must
  match the MediaMTX path name (`stairs1`, `corridor2`) — never the RTSP URL.
- Change a MediaMTX path: update `mediamtx.yml` **and** the camera row's `path`
  (UI Edit), then restart mediamtx. Old segments keep their old directory and
  age out via retention; discovery prunes their rows automatically.
