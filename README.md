# Security NVR

A lightweight, self-hosted Network Video Recorder (NVR) and local CCTV monitoring system built for a private home/lab environment.

The system provides a web interface for monitoring multiple IP cameras, managing camera configurations, viewing live streams, and eventually browsing and controlling recorded footage.

The application is designed around a separation of responsibilities:

* **Next.js** handles the web application, UI, application logic, and API.
* **MediaMTX** handles RTSP ingestion, live streaming, and recording.
* **PostgreSQL** will store persistent application metadata.
* **IP cameras** provide the source video streams.

---

## Architecture

```text
                    ┌─────────────────┐
                    │   IP Cameras    │
                    │                 │
                    │ RTSP Streams    │
                    └────────┬────────┘
                             │
                             │ RTSP
                             ▼
                    ┌─────────────────┐
                    │    MediaMTX     │
                    │                 │
                    │ RTSP ingestion  │
                    │ WebRTC          │
                    │ Recording       │
                    │ Playback        │
                    └────────┬────────┘
                             │
                    Live / Media Access
                             │
                             ▼
                    ┌─────────────────┐
                    │    Next.js      │
                    │   NVR Web App   │
                    │                 │
                    │ Dashboard       │
                    │ Camera Mgmt     │
                    │ Recordings      │
                    │ Playback        │
                    │ Authentication  │
                    │ API             │
                    └────────┬────────┘
                             │
                             │ Metadata
                             ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │                 │
                    │ Cameras         │
                    │ Users           │
                    │ Recordings      │
                    │ Configuration   │
                    └─────────────────┘
```

### Design Principle

The Next.js application does **not** process or proxy RTSP video.

MediaMTX is responsible for media infrastructure, while Next.js is responsible for the NVR application itself.

This keeps the web application lightweight and allows the media server to perform the work it is designed for.

---

# Current Status

The project is under active development.

### Currently implemented

* Next.js application
* TypeScript
* Initial NVR dashboard
* Dark CCTV-style interface
* Reusable `CameraCard` component
* Multiple camera display
* MediaMTX WebRTC stream embedding
* Camera management page
* Camera creation API
* Temporary in-memory camera storage
* Shared `Camera` TypeScript type
* Git/GitHub version control

### Planned

* PostgreSQL database
* Persistent camera management
* Camera deletion
* Camera editing
* Camera status monitoring
* Recording controls
* Recording browser
* Recording playback
* Date/time filtering
* Authentication
* User roles
* Security-person/operator accounts
* Dashboard navigation
* Camera health monitoring
* Deployment to the home server
* Support for a larger camera installation

---

# Technology Stack

## Frontend / Application

* [Next.js](https://nextjs.org/)
* [React](https://react.dev/)
* TypeScript
* Tailwind CSS

## Media Infrastructure

* [MediaMTX](https://github.com/bluenviron/mediamtx)
* RTSP
* WebRTC

## Database

* PostgreSQL

## Development

* Git
* GitHub
* Visual Studio Code
* Windows development machine
* Ubuntu Server for the homelab deployment

---

# Project Structure

The application currently follows this structure:

```text
security-nvr/
│
├── app/
│   ├── api/
│   │   └── cameras/
│   │       └── route.ts
│   │
│   ├── cameras/
│   │   └── page.tsx
│   │
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   └── CameraCard.tsx
│
├── types/
│   └── camera.ts
│
├── public/
│
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

The structure will evolve as features are added.

---

# Camera Model

A camera currently has the following application-level structure:

```ts
export type Camera = {
  name: string;
  path: string;
};
```

For example:

```json
{
  "name": "STAIRS 1",
  "path": "stairs1"
}
```

The `path` represents the MediaMTX stream path.

The application constructs the actual media URL from the configured MediaMTX server rather than storing the complete infrastructure URL with every camera.

When PostgreSQL is introduced, the persistent model is expected to become:

```text
Camera
├── id
├── name
└── stream_path
```

The database will generate the numeric `id`.

---

# API

The application is beginning to expose its own API through Next.js route handlers.

## Cameras

### Get cameras

```http
GET /api/cameras
```

Returns the configured cameras.

### Add camera

```http
POST /api/cameras
Content-Type: application/json
```

Example request:

```json
{
  "name": "LOBBY 1",
  "path": "lobby1"
}
```

The current implementation stores cameras temporarily in application memory.

This will be replaced by PostgreSQL persistence.

---

# MediaMTX

MediaMTX operates separately from the Next.js application.

Its responsibilities include:

* Receiving RTSP streams from cameras
* Providing live WebRTC streams
* Recording camera streams
* Managing recorded media
* Providing playback functionality

Example MediaMTX stream path:

```text
stairs1
```

The corresponding local WebRTC endpoint is:

```text
http://<MEDIAMTX_SERVER>:8889/stairs1
```

The Next.js application embeds the stream rather than directly handling RTSP.

---

# Development

## Requirements

Before running the application, install:

* Node.js
* npm
* Git

MediaMTX is only required when testing actual camera streams.

PostgreSQL will be required once database persistence is enabled.

---

## Install dependencies

From the project directory:

```bash
npm install
```

---

## Start development server

```bash
npm run dev
```

The application will normally be available at:

```text
http://localhost:3000
```

---

## Build for production

```bash
npm run build
```

---

## Start production server

```bash
npm start
```

---

## Lint

```bash
npm run lint
```

---

# Development Workflow

The project uses Git for version control.

The repository is hosted on GitHub.

Development should generally follow this workflow:

```text
Make a change
     ↓
Test locally
     ↓
Review the change
     ↓
git status
     ↓
git add
     ↓
git commit
     ↓
git push
```

Commits should describe the actual change.

Examples:

```text
feat: add camera management page
feat: add camera API
feat: connect camera dashboard to API
feat: add recording controls
fix: correct camera stream URL
refactor: extract camera type
```

---

# Environment Configuration

Environment-specific values should not be hardcoded into application code.

Future configuration will include values such as:

```env
MEDIAMTX_BASE_URL=http://192.168.0.146:8889
DATABASE_URL=postgresql://...
```

Secrets and environment files should never be committed to GitHub.

---

# Security Considerations

This system is intended primarily for local/private network use.

The application will eventually include:

* Authentication
* User accounts
* Role-based access control
* Protected camera-management operations
* Protected recording controls
* Input validation
* Secure environment-variable handling

The application should not expose camera streams or administrative functionality directly to the public internet without appropriate security controls.

---

# Planned Features

## Dashboard

```text
Dashboard
├── Camera grid
├── Live feeds
├── Camera names
├── Camera status
├── Recording indicators
├── Timestamp
└── Fullscreen controls
```

## Camera Management

```text
Camera Management
├── Add camera
├── Edit camera
├── Delete camera
├── View camera configuration
└── Check camera status
```

## Recording Management

```text
Recordings
├── Camera selection
├── Date selection
├── Time selection
├── Recording list
├── Playback
└── Recording deletion
```

## Authentication

```text
Users
├── Administrator
└── Security Operator
```

The exact permission model will be defined when authentication is implemented.

---

# Deployment Architecture

The development environment and production environment are intentionally separated.

### Development

```text
Windows PC
    │
    └── Next.js development server
```

### Homelab

```text
IP Cameras
     ↓
Ubuntu Server
     ├── MediaMTX
     ├── Recordings
     └── NVR services
```

The final deployment may run the Next.js application alongside the existing MediaMTX installation, depending on resource constraints.

Because the current Ubuntu server has limited hardware resources, unnecessary services should not be installed on it.

---

# Resource Considerations

The NVR is being designed with a lightweight architecture because the target homelab server has limited CPU and RAM resources.

The system should therefore avoid unnecessary processing of video inside the Next.js application.

Media processing should remain the responsibility of MediaMTX.

The application should primarily handle:

* Metadata
* Configuration
* Authentication
* UI rendering
* API operations
* User interactions

As the number of cameras increases, CPU, RAM, network bandwidth, storage usage, and recording retention will need to be monitored.

---

# Roadmap

### Phase 1 — Foundation

* [x] Initialize Next.js application
* [x] Configure TypeScript
* [x] Create NVR dashboard
* [x] Create reusable camera component
* [x] Connect dashboard to MediaMTX streams
* [x] Add multiple cameras

### Phase 2 — Camera Management

* [x] Create camera management page
* [x] Create camera API
* [ ] Persist cameras in PostgreSQL
* [ ] Add camera
* [ ] Edit camera
* [ ] Delete camera
* [ ] Camera status

### Phase 3 — Recording

* [ ] Recording controls
* [ ] Recording metadata
* [ ] Recording browser
* [ ] Date/time filtering
* [ ] Playback
* [ ] Recording deletion

### Phase 4 — Authentication

* [ ] Authentication
* [ ] User accounts
* [ ] Roles
* [ ] Protected administrative actions

### Phase 5 — Deployment

* [ ] Configure production environment
* [ ] Deploy Next.js application
* [ ] Configure MediaMTX service
* [ ] Configure startup/restart behavior
* [ ] Verify LAN access
* [ ] Test multiple simultaneous cameras
* [ ] Monitor system resources

### Phase 6 — Expansion

* [ ] Support additional floors
* [ ] Support approximately 15 cameras
* [ ] Improve dashboard layout
* [ ] Camera health monitoring
* [ ] Storage/retention management
* [ ] System administration interface

---

# Project Philosophy

The NVR is intentionally being built as a modular system rather than as a single application responsible for everything.

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

This separation allows each component to perform the job it is designed for while keeping the overall system maintainable and suitable for the available homelab hardware.
