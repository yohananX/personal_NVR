# Personal NVR

A lightweight, self-hosted Network Video Recorder (NVR) and local CCTV
monitoring system for a private home/lab environment.

The system provides a web interface for monitoring IP cameras, managing
camera configurations, viewing live streams, and browsing/deleting recorded
footage. It runs on a low-resource Ubuntu homelab server on the LAN
(`http://192.168.0.146:3000`) alongside MediaMTX and PostgreSQL. No Docker.

The application is designed around a separation of responsibilities:

* **Next.js** owns the application: dashboard, camera management, recording
  management, authentication, API, UI.
* **MediaMTX** owns video: RTSP ingestion, WebRTC live streaming, continuous
  recording, playback, control API.
* **PostgreSQL** owns persistent metadata: cameras, recordings, users,
  sessions.
* **IP cameras** provide the source RTSP streams.

---

## Architecture

```text
IP Cameras
    ↓ RTSP
MediaMTX
    ├── WebRTC live (WHEP, :8889)
    ├── Recording (continuous, 1h fmp4 segments, ~24h retention)
    ├── Playback (:9996/get)
    └── Control API (:9997, path liveness)
        ↓
Next.js NVR
    ├── Dashboard (auto-connecting live grid)
    ├── Camera management (ADMIN)
    ├── Recording management (browse / play / delete)
    ├── Authentication (ADMIN / OPERATOR)
    └── API
        ↓
PostgreSQL
    ├── cameras
    ├── recordings
    ├── users
    └── sessions
```

### Design principles

* The Next.js application does **not** process or proxy RTSP video, and the
  browser never connects directly to the cameras.
* Recording is **continuous in MediaMTX** (`record: yes` in
  `deploy/mediamtx-ghis-snippet.yml`). The NVR discovers segment files via
  `POST /api/sync` (systemd timer every 5 minutes + MediaMTX
  `runOnRecordSegmentComplete` webhook) and plays them through the MediaMTX
  playback server. There is deliberately no fake browser-side "Record" button.
* Deleting a recording removes **both** the segment file and its PostgreSQL
  row, keeping the two systems consistent.

---

## Current capabilities

* Next.js 16 + React 19 + TypeScript + Tailwind CSS application
* PostgreSQL persistence for cameras, recordings, users, sessions
* Camera management: add / edit / delete (ADMIN only), persistent storage
* Authentication: scrypt password hashing, stateful sessions, httpOnly
  `nvr_session` cookie, 7-day sliding expiry, instant revoke
* Roles: `ADMIN` (cameras, users, sync, recording deletion) and `OPERATOR`
  (live feeds, recordings, playback)
* MediaMTX integration: WHEP/WebRTC live feeds (`LivePlayer`, muted autoplay),
  server-side path liveness for the dashboard (`GET /api/mediamtx/status`)
* Recording discovery/synchronization (`POST /api/sync`, machine secret or
  ADMIN session), pruning of expired segments
* Recording browser with camera/date/time filters and pagination
  (`GET /api/recordings` envelope `{ items, total, page, limit }`)
* Recording playback via MediaMTX (`GET /api/recordings/:id` +
  `RecordingPlayer`)
* Recording deletion (ADMIN): file + metadata (`DELETE /api/recordings/:id`)
* Public health endpoint (`GET /api/health`: db + MediaMTX reachability)
* Database backups (daily `nvr-backup.timer`, 7-day retention)
* systemd deployment: `nvr-nextjs.service`, `nvr-sync.service` +
  `nvr-sync.timer`, `nvr-backup.service` + `nvr-backup.timer`,
  `mediamtx.service`
* LAN operation over plain HTTP (`AUTH_COOKIE_SECURE=false`); set
  `AUTH_COOKIE_SECURE=true` when HTTPS is introduced

---

## Project structure

```text
personal_NVR/
├── README.md                  ← this file
└── security-nvr/              ← application root (run npm commands here)
    ├── app/
    │   ├── page.tsx           ← dashboard (live grid)
    │   ├── cameras/
    │   │   ├── page.tsx       ← camera management
    │   │   └── [id]/page.tsx  ← camera detail (live + recordings)
    │   ├── recordings/
    │   │   ├── page.tsx       ← recording browser
    │   │   └── [id]/page.tsx  ← recording playback
    │   ├── login/page.tsx
    │   └── api/
    │       ├── cameras/route.ts          ← GET list, POST create (ADMIN)
    │       ├── cameras/[id]/route.ts     ← GET, PUT, DELETE (ADMIN writes)
    │       ├── recordings/route.ts       ← GET filtered + paginated
    │       ├── recordings/[id]/route.ts  ← GET playback meta, DELETE (ADMIN)
    │       ├── sync/route.ts             ← POST discovery, GET status
    │       ├── health/route.ts           ← public health
    │       ├── mediamtx/status/route.ts  ← path liveness
    │       └── auth/login|logout|me/route.ts
    ├── components/
    │   ├── LivePlayer.tsx           ← auto-connecting WHEP player
    │   ├── CameraCard.tsx           ← dashboard card (status + REC + Open)
    │   ├── RecordingPlayer.tsx      ← MediaMTX playback <video>
    │   ├── RecordingDeleteButton.tsx← confirmed real deletion (ADMIN)
    │   ├── SyncButton.tsx           ← ADMIN "Sync now"
    │   ├── LogoutButton.tsx
    │   └── Clock.tsx
    ├── lib/
    │   ├── auth.ts            ← scrypt + sessions + cookie
    │   ├── db.ts              ← pg pool (DATABASE_URL)
    │   ├── mediamtx.ts        ← WHEP/playback URL strategy
    │   ├── mediamtx-api.ts    ← control-API liveness client
    │   └── recordings-sync.ts ← filesystem discovery
    ├── types/camera.ts
    ├── db/migrations/
    │   ├── 001_recordings.sql     ← baseline: cameras + recordings
    │   ├── 002_recordings_sync.sql← sync uniqueness + lookup index
    │   └── 003_auth.sql           ← users + sessions
    ├── scripts/
    │   ├── apply-migration.mjs  ← npm run migrate -- <file>
    │   ├── create-user.mjs      ← npm run user:create
    │   ├── seed-fake-segments.mjs
    │   └── backup-db.sh
    ├── deploy/
    │   ├── nvr-nextjs.service, nvr-sync.service/.timer,
    │   │   nvr-backup.service/.timer
    │   ├── db-init.sql          ← role + database bootstrap (once)
    │   └── mediamtx-ghis-snippet.yml
    ├── docs/deploy-ghis.md    ← full server deployment guide
    ├── middleware.ts          ← redirect anonymous page visits to /login
    └── .env.example           ← all required variables (no secrets)
```

---

## Setup

### Requirements

* Node.js 22 LTS + npm
* PostgreSQL (local dev or the homelab server)
* Git
* MediaMTX + cameras only for real streams (dev PC works without them and
  shows placeholders)

### Install dependencies

From the application root:

```bash
cd security-nvr
npm ci
```

### Development

```bash
npm run dev
```

Available at `http://localhost:3000`. Without `NEXT_PUBLIC_MEDIAMTX_BASE`,
live/playback areas render placeholders instead of failing.

### Production

```bash
npm run build
npm start
# LAN: npm run start:lan  (next start -H 0.0.0.0 -p 3000)
```

### Lint

```bash
npm run lint
```

---

## Environment variables

Copy and edit (never commit `.env.local` — it is git-ignored):

```bash
cp .env.example .env.local
chmod 600 .env.local
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection for the app (`nvr_app` role) |
| `NEXT_PUBLIC_MEDIAMTX_BASE` | Browser-facing WebRTC base, e.g. `http://192.168.0.146:8889` (empty on dev PC → placeholder) |
| `NEXT_PUBLIC_MEDIAMTX_PLAYBACK_BASE` | Browser-facing playback base, e.g. `http://192.168.0.146:9996` (empty on dev PC → placeholder) |
| `RECORDINGS_DIR` | Server-side directory MediaMTX writes to, e.g. `/srv/mediamtx/recordings` (unset on dev PC → sync skips) |
| `SYNC_SECRET` | Shared secret for machine callers of `POST /api/sync` (`openssl rand -hex 32`) |
| `MEDIAMTX_API_BASE` | Server-side MediaMTX control API, e.g. `http://127.0.0.1:9997` (empty → cards show UNKNOWN) |
| `AUTH_COOKIE_SECURE` | `false` for the current HTTP LAN deployment; `true` once HTTPS exists |

---

## Database migrations

Migrations must be run **in order** on a fresh database:

```bash
npm run migrate -- db/migrations/001_recordings.sql
npm run migrate -- db/migrations/002_recordings_sync.sql
npm run migrate -- db/migrations/003_auth.sql
# ...or: psql "$DATABASE_URL" -f db/migrations/001_recordings.sql (etc.)
```

| File | Contents |
|---|---|
| `001_recordings.sql` | Baseline `cameras` + `recordings` tables and base indexes |
| `002_recordings_sync.sql` | Sync uniqueness `(camera_id, file_path)` + lookup index |
| `003_auth.sql` | `users` + `sessions` tables and indexes |

All files are idempotent (`IF NOT EXISTS`) and safe to re-run. Final schema:
`cameras`, `recordings`, `users`, `sessions`.

---

## Authentication

Create the initial ADMIN account (password never committed):

```bash
npm run user:create -- --username admin --role ADMIN --password '<secret>'
```

* Login at `/login`; anonymous visits to `/`, `/cameras/*`, `/recordings/*`
  redirect there (edge middleware + server `requireUser`).
* `OPERATOR` can view live feeds and recordings. Camera add/edit/delete,
  recording deletion, manual sync, and user creation require `ADMIN`
  (enforced in API routes with 401/403, UI hides the controls).
* Session cookie `nvr_session`: `HttpOnly`, `SameSite=Lax`, `Secure` only
  when `AUTH_COOKIE_SECURE=true`.

---

## MediaMTX

Critical distinction: the camera `path` in PostgreSQL is the **MediaMTX path
name**, not the camera's RTSP URL.

```text
Physical camera:  192.168.0.173
RTSP source in mediamtx.yml:  rtsp://192.168.0.173/live/ch00_0
NVR camera path:  stairs1
Live (browser):   http://192.168.0.146:8889/stairs1/whep
Playback:         http://192.168.0.146:9996/get?path=stairs1&start=…&duration=…s
Segments on disk: /srv/mediamtx/recordings/stairs1/2026-09-26_10-00-00-000000.mp4
```

Merge `deploy/mediamtx-ghis-snippet.yml` into the server's `mediamtx.yml`
(continuous recording, playback server, WHEP origins, per-path sources, sync
webhook) — see `docs/deploy-ghis.md`.

---

## Deployment

Full guide: [`security-nvr/docs/deploy-ghis.md`](security-nvr/docs/deploy-ghis.md).

Standard layout on `ghis` (all service files and docs agree on this):

```text
App:      /opt/personal_NVR/security-nvr   (service user: nvr)
Secrets:  /opt/personal_NVR/security-nvr/.env.local (mode 600)
Recordings: /srv/mediamtx/recordings
Backups:  /var/backups/nvr
```

Low-resource Ubuntu server: no Docker, Next.js + MediaMTX + PostgreSQL only.
After any service change, run the reboot verification in the deploy guide
(services restart → NVR accessible → login works → streams connect →
recordings continue).

---

## Development workflow

```text
branch/change
    ↓ test locally (dev server + DB)
    ↓ npm run lint
    ↓ npm run build
    ↓ review: git status + git diff (no secrets, no .env.local, no node_modules)
    ↓ commit (logical, tested states only)
    ↓ push
```

Per-change rule: inspect → change → test → build → review diff → commit.
Never push untested changes; never claim hardware-dependent behavior
(RTSP streams, WHEP connections, physical recording, reboot survival) as
verified without the server/cameras.

---

## Current roadmap

* HTTPS for the LAN deployment (then `AUTH_COOKIE_SECURE=true`) + refresh
  MediaMTX/WebRTC allowed origins accordingly
* Storage/retention management UI (currently fixed ~24h in `mediamtx.yml`)
* Camera health monitoring history (currently point-in-time liveness only)
* Support the ~15-camera expansion; monitor CPU/RAM/bandwidth/storage
* Rename the deprecated `middleware.ts` convention to `proxy.ts` per the
  Next.js 16 codemod warning (cosmetic, do on a quiet change)

---

## Project philosophy

```text
MediaMTX
    → handles video

Next.js
    → handles the application

PostgreSQL
    → handles persistent metadata

Browser
    → provides the operator interface
```

Every visible control maps to a real system capability: live means a
MediaMTX publisher is connected, REC means recent segments exist, Delete
removes the file and its row. No mockup buttons.
