export default function Home() {
  const cameras = [
    {
      name: "STAIRS 1",
      path: "stairs1",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-semibold">SECURITY NVR</h1>
        <p className="text-sm text-zinc-400">
          Local CCTV Monitoring System
        </p>
      </header>

      <section className="p-6">
        <h2 className="mb-4 text-lg font-medium">Dashboard</h2>

        {cameras.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="text-zinc-400">No cameras configured.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cameras.map((camera) => (
              <div
                key={camera.path}
                className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                  <div>
                    <h3 className="font-medium">{camera.name}</h3>
                    <p className="text-xs text-zinc-500">{camera.path}</p>
                  </div>

                  <span className="text-xs text-zinc-500">OFFLINE</span>
                </div>

                <div className="flex aspect-video items-center justify-center bg-black">
                  <span className="text-sm text-zinc-600">
                    Camera feed
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}