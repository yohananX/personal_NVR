import Link from "next/link";
import LivePlayer from "@/components/LivePlayer";

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
  const response = await fetch(
    `http://localhost:3000/api/cameras/${id}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch camera");
  }

  return response.json();
}

async function getRecordings(id: string): Promise<Recording[]> {
  const response = await fetch(
    `http://localhost:3000/api/recordings?cameraId=${id}`,
    {
      cache: "no-store",
    }
  );

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
    new Date(endedAt).getTime() -
    new Date(startedAt).getTime();

  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  return `${minutes}m ${seconds}s`;
}

export default async function CameraPage({
  params,
}: CameraPageProps) {
  const { id } = await params;

  const [camera, recordings] = await Promise.all([
    getCamera(id),
    getRecordings(id),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-sm text-zinc-500 hover:text-white"
            >
              ← Cameras
            </Link>

            <h1 className="mt-2 text-xl font-semibold">
              {camera.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-zinc-500" />
            <span className="text-sm text-zinc-500">
              OFFLINE
            </span>
          </div>
        </div>
      </header>

      <section className="p-6">
        <div className="mx-auto max-w-6xl">

          {/* Live feed */}
          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-black">
            <LivePlayer path={camera.path} autoPlay />
          </div>

          {/* Camera information */}
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-500">
                  STREAM PATH
                </p>

                <p className="mt-1 text-sm">
                  {camera.path}
                </p>
              </div>

              <button
                type="button"
                className="rounded-md border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
              >
                Fullscreen
              </button>
            </div>
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

                    <Link href={`/recordings/${recording.id}`} className="text-left text-sm text-zinc-400 hover:text-white">
                        Play
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}