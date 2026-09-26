import { cookies } from "next/headers";
import CameraCard from "@/components/CameraCard";
import Clock from "@/components/Clock";
import LogoutButton from "@/components/LogoutButton";
import type { Camera } from "@/types/camera";
import type { PathLiveness } from "@/lib/mediamtx-api";
import { requireUser } from "@/lib/auth";

async function getCameras(): Promise<Camera[]> {
  const cookie = (await cookies()).toString();
  const response = await fetch("http://localhost:3000/api/cameras", {
    cache: "no-store",
    headers: { Cookie: cookie },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch cameras");
  }

  return response.json();
}

export default async function Home() {
  const user = await requireUser();
  const cookie = (await cookies()).toString();
  const [cameras, liveness] = await Promise.all([
    getCameras(),
    fetch("http://localhost:3000/api/mediamtx/status", {
      cache: "no-store",
      headers: { Cookie: cookie },
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null) as Promise<PathLiveness | null>,
  ]);

  const liveCount = liveness?.reachable
    ? cameras.filter((c) => liveness.online[c.path]).length
    : 0;
  const mediaLabel = !liveness?.configured
    ? "MediaMTX unconfigured"
    : liveness.reachable
      ? `MediaMTX · ${liveCount}/${cameras.length} live`
      : "MediaMTX unreachable";

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              SECURITY NVR
            </h1>

            <p className="text-sm text-zinc-400">
              Local CCTV Monitoring System
            </p>
          </div>

          <div className="text-right">
            <Clock />

            <p className="mt-1 text-xs text-zinc-500">
              {mediaLabel}
            </p>

            <div className="mt-1 flex items-center justify-end gap-2">
              <span className="h-2 w-2 rounded-full bg-zinc-500" />

              <span className="text-sm text-zinc-400">
                Development
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">
              Cameras
            </h2>

            <p className="text-sm text-zinc-500">
              {cameras.length} configured · {user.username} (
              {user.role})
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="/cameras"
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              Manage Cameras
            </a>
            <LogoutButton />
          </div>
        </div>

        {cameras.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="text-zinc-400">
              No cameras configured.
            </p>

            <a
              href="/cameras"
              className="mt-4 inline-block text-sm text-white underline"
            >
              Add a camera
            </a>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cameras.map((camera) => (
              <CameraCard
                key={camera.path}
                camera={camera}
                live={
                  liveness?.configured
                    ? (liveness.online[camera.path] ?? false)
                    : null
                }
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}