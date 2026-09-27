import { cookies } from "next/headers";
import Link from "next/link";
import RecordingDeleteButton from "@/components/RecordingDeleteButton";
import RecordingPlayer from "@/components/RecordingPlayer";
import { requireUser } from "@/lib/auth";

type Recording = {
  id: number;
  camera_id: number;
  file_path: string;
  started_at: string;
  ended_at: string;
  created_at: string;
  camera_name: string;
  camera_path: string;
};

type RecordingPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function getRecording(id: string): Promise<Recording> {
  const cookie = (await cookies()).toString();
  const response = await fetch(
    `http://localhost:3000/api/recordings/${id}`,
    {
      cache: "no-store",
      headers: { Cookie: cookie },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch recording");
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

export default async function RecordingPage({
  params,
}: RecordingPageProps) {
  const user = await requireUser();
  const { id } = await params;

  const recording = await getRecording(id);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className="text-zinc-500 hover:text-white"
          >
            ← Dashboard
          </Link>
          <span className="text-zinc-700">·</span>
          <Link
            href={`/cameras/${recording.camera_id}`}
            className="text-zinc-500 hover:text-white"
          >
            ← {recording.camera_name}
          </Link>
        </div>

        <h1 className="mt-2 text-xl font-semibold">
          Recording Playback
        </h1>
      </header>

      <section className="p-6">
        <div className="mx-auto max-w-6xl">

          {/* Playback area */}
          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-black">
            <RecordingPlayer
              cameraPath={recording.camera_path}
              startedAt={recording.started_at}
              endedAt={recording.ended_at}
              filePath={recording.file_path}
            />
          </div>

          {/* Recording information */}
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <div className="grid gap-6 md:grid-cols-3">

              <div>
                <p className="text-xs text-zinc-500">
                  CAMERA
                </p>

                <p className="mt-1 text-sm">
                  {recording.camera_name}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  STARTED
                </p>

                <p className="mt-1 text-sm">
                  {formatDate(recording.started_at)}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  DURATION
                </p>

                <p className="mt-1 text-sm">
                  {getDuration(
                    recording.started_at,
                    recording.ended_at
                  )}
                </p>
              </div>

            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
              <div>
                <p className="text-xs text-zinc-500">
                  RECORDING FILE
                </p>

                <p className="mt-1 font-mono text-sm text-zinc-400">
                  {recording.file_path}
                </p>
              </div>

              {user.role === "ADMIN" && (
                <RecordingDeleteButton
                  id={recording.id}
                  startedAt={recording.started_at}
                  redirectTo={`/cameras/${recording.camera_id}`}
                />
              )}
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}