import { cookies } from "next/headers";
import Link from "next/link";
import LivePlayer from "@/components/LivePlayer";
import RecordingDeleteButton from "@/components/RecordingDeleteButton";
import type { PathLiveness } from "@/lib/mediamtx-api";
import { requireUser } from "@/lib/auth";

type Camera = {
  id: number;
  name: string;
  path: string;
  created_at: string;
};

type Recording = {
  id: number;
  camera_id: number;
  file_path: string;
  started_at: string;
  ended_at: string;
  created_at: string;
};

type CameraPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function getCamera(id: string): Promise<Camera> {
  const cookie = (await cookies()).toString();
  const response = await fetch(
    `http://localhost:3000/api/cameras/${id}`,
    {
      cache: "no-store",
      headers: { Cookie: cookie },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch camera");
  }

  return response.json();
}

async function getRecordings(id: string): Promise<Recording[]> {
  const cookie = (await cookies()).toString();
  const response = await fetch(
    `http://localhost:3000/api/recordings?cameraId=${id}&limit=200`,
    {
      cache: "no-store",
      headers: { Cookie: cookie },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch recordings");
  }

  const data = await response.json();
  return data.items as Recording[];
}

async function getLiveness(): Promise<PathLiveness | null> {
  const cookie = (await cookies()).toString();
  try {
    const response = await fetch(
      "http://localhost:3000/api/mediamtx/status",
      {
        cache: "no-store",
        headers: { Cookie: cookie },
      }
    );
    if (!response.ok) return null;
    return (await response.json()) as PathLiveness;
  } catch {
    return null;
  }
}

function formatDateTime(date: string) {
  const d = new Date(date);
  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString(),
    full: d.toLocaleString(),
  };
}

function formatDuration(startedAt: string, endedAt: string) {
  const ms =
    new Date(endedAt).getTime() -
    new Date(startedAt).getTime();
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default async function CameraPage({
  params,
}: CameraPageProps) {
  const user = await requireUser();
  const { id } = await params;

  const [camera, recordings, liveness] = await Promise.all([
    getCamera(id),
    getRecordings(id),
    getLiveness(),
  ]);

  const live = liveness?.configured
    ? (liveness.online[camera.path] ?? false)
    : null;
  const dot =
    live === true
      ? "bg-green-500"
      : live === false
        ? "bg-red-500"
        : "bg-zinc-500";
  const label =
    live === true ? "LIVE" : live === false ? "OFFLINE" : "UNKNOWN";

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-4 py-3 md:px-6 md:py-4">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Dashboard
        </Link>

        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="truncate text-xl font-semibold">
            {camera.name}
          </h1>

          <div className="flex shrink-0 items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            <span className="text-sm text-zinc-400">
              {label}
            </span>
          </div>
        </div>
      </header>

      <section className="p-4 md:p-6">
        <div className="mx-auto max-w-6xl">
          {/* Live feed */}
          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-black">
            <LivePlayer path={camera.path} />
          </div>

          {/* Camera information */}
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-500">
                  STREAM PATH
                </p>

                <p className="mt-1 font-mono text-sm">
                  {camera.path}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-zinc-500">
                  ADDED
                </p>

                <p className="mt-1 text-sm text-zinc-300">
                  {new Date(camera.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Recording status: MediaMTX records continuously, so there is
              no start/stop button to press. The real controls are Play
              (MediaMTX playback) and Delete (file + metadata) below. */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <p className="text-sm text-zinc-300">
                Continuous recording
                <span className="text-zinc-500">
                  {" "}
                  · MediaMTX captures 1h segments (~24h retention)
                </span>
              </p>
            </div>

            <span className="text-xs text-zinc-500">
              {recordings.length} segment
              {recordings.length !== 1 ? "s" : ""} stored
            </span>
          </div>

          {/* Recordings */}
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">
                Recordings
              </h2>

              <span className="text-xs text-zinc-500">
                {recordings.length} recording
                {recordings.length !== 1 ? "s" : ""}
              </span>
            </div>

            {recordings.length === 0 ? (
              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <p className="text-sm text-zinc-500">
                  No recordings available yet. Segments appear here
                  after MediaMTX finishes them and discovery runs
                  (every 5 minutes on ghis).
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
                <div className="hidden grid-cols-[110px_1fr_90px_130px] border-b border-zinc-800 bg-zinc-900 px-4 py-3 text-xs text-zinc-500 md:grid">
                  <span>DATE</span>
                  <span>START</span>
                  <span>DURATION</span>
                  <span className="text-right">ACTIONS</span>
                </div>

                {recordings.map((recording) => {
                  const when = formatDateTime(recording.started_at);
                  return (
                    <div
                      key={recording.id}
                      className="grid gap-1 border-b border-zinc-800 bg-zinc-950 px-4 py-3 last:border-b-0 md:grid-cols-[110px_1fr_90px_130px] md:items-center md:gap-0"
                    >
                      <span className="text-sm text-zinc-300">
                        {when.date}
                      </span>

                      <div className="min-w-0">
                        <p className="text-sm">
                          {when.time}
                        </p>

                        <p className="mt-0.5 truncate font-mono text-xs text-zinc-600">
                          {recording.file_path}
                        </p>
                      </div>

                      <span className="text-sm text-zinc-400">
                        {formatDuration(
                          recording.started_at,
                          recording.ended_at
                        )}
                      </span>

                      <span className="flex items-center gap-4 md:justify-end">
                        <Link
                          href={`/recordings/${recording.id}`}
                          className="text-sm text-zinc-300 hover:text-white"
                        >
                          Play
                        </Link>
                        {user.role === "ADMIN" && (
                          <RecordingDeleteButton
                            id={recording.id}
                            startedAt={recording.started_at}
                          />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
