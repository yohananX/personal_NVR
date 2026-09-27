import { cookies } from "next/headers";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import RecordingDeleteButton from "@/components/RecordingDeleteButton";
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

type RecordingsResponse = {
  items: Recording[];
  total: number;
  page: number;
  limit: number;
};

type RecordingsPageProps = {
  searchParams: Promise<{
    cameraId?: string;
    date?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

const PAGE_LIMIT = 50;

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

async function getRecordings(params: {
  cameraId?: string;
  date?: string;
  from?: string;
  to?: string;
  page: number;
}): Promise<RecordingsResponse> {
  const query = new URLSearchParams();
  if (params.cameraId) query.set("cameraId", params.cameraId);
  if (params.date) query.set("date", params.date);
  if (params.date && params.from) query.set("from", params.from);
  if (params.date && params.to) query.set("to", params.to);
  query.set("page", String(params.page));
  query.set("limit", String(PAGE_LIMIT));

  const response = await fetch(
    `http://localhost:3000/api/recordings?${query.toString()}`,
    {
      cache: "no-store",
      headers: { Cookie: (await cookies()).toString() },
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

function formatDay(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function durationMs(startedAt: string, endedAt: string) {
  return (
    new Date(endedAt).getTime() - new Date(startedAt).getTime()
  );
}

function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m ${seconds}s`;
}

function hrefWith(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `/recordings?${qs}` : "/recordings";
}

export default async function RecordingsPage({
  searchParams,
}: RecordingsPageProps) {
  const user = await requireUser();
  const { cameraId, date, from, to, page: pageParam } =
    await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const [cameras, data] = await Promise.all([
    getCameras(),
    getRecordings({ cameraId, date, from, to, page }),
  ]);

  const { items: recordings, total } = data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const hasFilters = Boolean(cameraId || date || from || to);

  const base = { cameraId, date, from, to };

  const groups = new Map<string, Recording[]>();
  for (const recording of recordings) {
    const day = new Date(recording.started_at).toDateString();
    const list = groups.get(day) ?? [];
    list.push(recording);
    groups.set(day, list);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Dashboard
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
              href={hrefWith({ date, from, to }, { cameraId: undefined })}
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
                href={hrefWith(base, { cameraId: String(camera.id) })}
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

          <form
            method="get"
            action="/recordings"
            className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
          >
            {cameraId && (
              <input type="hidden" name="cameraId" value={cameraId} />
            )}

            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                DATE
              </label>
              <input
                type="date"
                name="date"
                defaultValue={date ?? ""}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                FROM
              </label>
              <input
                type="time"
                name="from"
                defaultValue={from ?? ""}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                TO
              </label>
              <input
                type="time"
                name="to"
                defaultValue={to ?? ""}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm outline-none"
              />
            </div>

            <button
              type="submit"
              className="rounded-md bg-white px-4 py-1 text-sm font-medium text-black"
            >
              Apply
            </button>

            {hasFilters && (
              <Link
                href="/recordings"
                className="rounded-md border border-zinc-700 px-4 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Clear
              </Link>
            )}
          </form>

          <p className="mt-4 text-sm text-zinc-500">
            {total} recording{total !== 1 ? "s" : ""}
            {totalPages > 1 && ` · page ${page} of ${totalPages}`}
          </p>

          {recordings.length === 0 ? (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm text-zinc-500">
                {hasFilters
                  ? "No recordings match these filters."
                  : "No recordings available."}
              </p>
              {hasFilters && (
                <Link
                  href="/recordings"
                  className="mt-2 inline-block text-sm text-white underline"
                >
                  Clear filters
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              {[...groups.entries()].map(([day, list]) => (
                <div key={day}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h2 className="text-sm font-medium text-zinc-300">
                      {formatDay(list[0].started_at)}
                    </h2>
                    <span className="text-xs text-zinc-500">
                      {list.length} recording
                      {list.length !== 1 ? "s" : ""} ·{" "}
                      {formatDuration(
                        list.reduce(
                          (sum, r) =>
                            sum +
                            durationMs(r.started_at, r.ended_at),
                          0
                        )
                      )}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-zinc-800">
                    <div className="grid grid-cols-[1fr_140px_150px] border-b border-zinc-800 bg-zinc-900 px-4 py-3 text-xs text-zinc-500">
                      <span>STARTED</span>
                      <span>DURATION</span>
                      <span className="text-right">ACTIONS</span>
                    </div>

                    {list.map((recording) => (
                      <div
                        key={recording.id}
                        className="grid grid-cols-[1fr_140px_150px] items-center border-b border-zinc-800 bg-zinc-950 px-4 py-3 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm">
                            {formatDate(recording.started_at)}
                          </p>

                          <p className="mt-1 truncate font-mono text-xs text-zinc-600">
                            {recording.file_path}
                          </p>
                        </div>

                        <span className="text-sm text-zinc-400">
                          {formatDuration(
                            durationMs(
                              recording.started_at,
                              recording.ended_at
                            )
                          )}
                        </span>

                        <span className="flex items-center justify-end gap-4">
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
                    ))}
                  </div>
                </div>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  {page > 1 ? (
                    <Link
                      href={hrefWith(base, { page: String(page - 1) })}
                      className="rounded-md border border-zinc-700 px-4 py-1 text-sm hover:bg-zinc-900"
                    >
                      ← Newer
                    </Link>
                  ) : (
                    <span />
                  )}

                  <span className="text-xs text-zinc-500">
                    Page {page} of {totalPages}
                  </span>

                  {page < totalPages ? (
                    <Link
                      href={hrefWith(base, { page: String(page + 1) })}
                      className="rounded-md border border-zinc-700 px-4 py-1 text-sm hover:bg-zinc-900"
                    >
                      Older →
                    </Link>
                  ) : (
                    <span />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
