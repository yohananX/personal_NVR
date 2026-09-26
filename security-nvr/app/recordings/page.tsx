import { cookies } from "next/headers";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import SyncButton from "@/components/SyncButton";
import { requireUser } from "@/lib/auth";

type Camera = {
  id: number;
  name: string;
  path: string;
};

type Recording = {
  id: number;
  camera_id: number;
  file_path: string;
  started_at: string;
  ended_at: string;
  created_at: string;
};

type RecordingsPageProps = {
  searchParams: Promise<{
    cameraId?: string;
  }>;
};

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

async function getRecordings(cameraId?: string): Promise<Recording[]> {
  const url = cameraId
    ? `http://localhost:3000/api/recordings?cameraId=${cameraId}`
    : "http://localhost:3000/api/recordings";

  const response = await fetch(url, {
    cache: "no-store",
    headers: { Cookie: (await cookies()).toString() },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch recordings");
  }

  return response.json();
}

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

function getDuration(startedAt: string, endedAt: string) {
  const duration =
    new Date(endedAt).getTime() - new Date(startedAt).getTime();

  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  return `${minutes}m ${seconds}s`;
}

export default async function RecordingsPage({
  searchParams,
}: RecordingsPageProps) {
  const user = await requireUser();
  const { cameraId } = await searchParams;

  const [cameras, recordings] = await Promise.all([
    getCameras(),
    getRecordings(cameraId),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Cameras
        </Link>

        <h1 className="mt-2 text-xl font-semibold">Recordings</h1>

        <div className="mt-3 flex items-center justify-between gap-2">
          {user.role === "ADMIN" ? <SyncButton /> : <span />}
          <LogoutButton />
        </div>
      </header>

      <section className="p-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/recordings"
              className={`rounded-md border px-3 py-1 text-sm ${
                !cameraId
                  ? "border-white bg-white text-black"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              All cameras
            </Link>

            {cameras.map((camera) => (
              <Link
                key={camera.id}
                href={`/recordings?cameraId=${camera.id}`}
                className={`rounded-md border px-3 py-1 text-sm ${
                  cameraId === String(camera.id)
                    ? "border-white bg-white text-black"
                    : "border-zinc-700 text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                {camera.name}
              </Link>
            ))}
          </div>

          <p className="mt-4 text-sm text-zinc-500">
            {recordings.length} recording
            {recordings.length !== 1 ? "s" : ""}
          </p>

          {recordings.length === 0 ? (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm text-zinc-500">
                No recordings available.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
              <div className="grid grid-cols-[1fr_180px_100px] border-b border-zinc-800 bg-zinc-900 px-4 py-3 text-xs text-zinc-500">
                <span>STARTED</span>
                <span>DURATION</span>
                <span>ACTION</span>
              </div>

              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className="grid grid-cols-[1fr_180px_100px] items-center border-b border-zinc-800 bg-zinc-950 px-4 py-3 last:border-b-0"
                >
                  <div>
                    <p className="text-sm">
                      {formatDate(recording.started_at)}
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      {recording.file_path}
                    </p>
                  </div>

                  <span className="text-sm text-zinc-400">
                    {getDuration(
                      recording.started_at,
                      recording.ended_at
                    )}
                  </span>

                  <Link
                    href={`/recordings/${recording.id}`}
                    className="text-left text-sm text-zinc-400 hover:text-white"
                  >
                    Play
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
