/**
 * What: central MediaMTX URL strategy.
 * Why: browser must connect directly to MediaMTX (Next.js never proxies RTSP
 *   and never proxies recordings - it only stores metadata).
 * NVR fit: camera DB `path` (stairs1, corridor2) maps 1:1 to MediaMTX path
 *   for both live (WHEP :8889) and playback (:9996 /get).
 *
 * Dev-PC safe: if envs are unset, helpers return null and players render
 * an offline placeholder instead of crashing.
 */

export function getMediaMtxBase(): string | null {
  const base = process.env.NEXT_PUBLIC_MEDIAMTX_BASE?.trim();
  if (!base) return null;
  return base.replace(/\/$/, "");
}

export function isMediaMtxConfigured(): boolean {
  return getMediaMtxBase() !== null;
}

export function getWhepUrl(path: string): string | null {
  const base = getMediaMtxBase();
  if (!base) return null;
  const clean = path.trim().replace(/^\/+/, "");
  return `${base}/${clean}/whep`;
}

export function getEmbedUrl(path: string): string | null {
  const base = getMediaMtxBase();
  if (!base) return null;
  const clean = path.trim().replace(/^\/+/, "");
  return `${base}/${clean}`;
}

export function getPlaybackBase(): string | null {
  const base = process.env.NEXT_PUBLIC_MEDIAMTX_PLAYBACK_BASE?.trim();
  if (!base) return null;
  return base.replace(/\/$/, "");
}

export function getRecordingDurationSec(
  startedAt: string,
  endedAt: string
): number {
  const ms =
    new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return Math.max(1, Math.round(ms / 1000));
}

/**
 * Build a browser-playable MediaMTX playback URL:
 *   {base}/get?path=<path>&start=<RFC3339>&duration=<Ns>
 * Uses fmp4 (default) - natively playable in <video>.
 * file_path from Postgres is NOT used in the URL - it is display-only.
 * The mapping key is camera_path + started_at + duration.
 */
export function getRecordingPlaybackUrl(
  cameraPath: string,
  startedAt: string,
  endedAt: string
): string | null {
  const base = getPlaybackBase();
  if (!base) return null;
  const clean = cameraPath.trim().replace(/^\/+/, "");
  const start = new Date(startedAt).toISOString();
  const durationSec = getRecordingDurationSec(startedAt, endedAt);
  return `${base}/get?path=${encodeURIComponent(
    clean
  )}&start=${encodeURIComponent(start)}&duration=${durationSec}s`;
}
