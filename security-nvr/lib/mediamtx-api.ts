/**
 * What: server-side MediaMTX control API client (path liveness).
 * Why: the browser must not fan out to MediaMTX per camera; one server-side
 *   call per dashboard render keeps LAN overhead flat for ~15 cameras.
 * NVR fit: `ready=true` on a path means a publisher is connected = LIVE.
 * Dev-PC safe: MEDIAMTX_API_BASE unset or unreachable -> {configured:false}
 *   and the UI shows UNKNOWN instead of erroring.
 */

export type PathLiveness = {
  configured: boolean;
  reachable: boolean;
  online: Record<string, boolean>;
};

export function getMediaMtxApiBase(): string | null {
  const base = process.env.MEDIAMTX_API_BASE?.trim();
  if (!base) return null;
  return base.replace(/\/$/, "");
}

export async function getPathLiveness(): Promise<PathLiveness> {
  const base = getMediaMtxApiBase();
  if (!base) {
    return { configured: false, reachable: false, online: {} };
  }

  try {
    const headers: Record<string, string> = {};
    const user = process.env.MEDIAMTX_API_USER?.trim();
    const pass = process.env.MEDIAMTX_API_PASS ?? "";
    if (user) {
      headers.Authorization =
        "Basic " +
        Buffer.from(`${user}:${pass}`).toString("base64");
    }

    const response = await fetch(`${base}/v3/paths/list`, {
      headers,
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) {
      return { configured: true, reachable: false, online: {} };
    }

    const data = (await response.json()) as {
      items?: { name: string; ready?: boolean }[];
    };
    const online: Record<string, boolean> = {};
    for (const item of data.items ?? []) {
      online[item.name] = item.ready === true;
    }
    return { configured: true, reachable: true, online };
  } catch {
    return { configured: true, reachable: false, online: {} };
  }
}
