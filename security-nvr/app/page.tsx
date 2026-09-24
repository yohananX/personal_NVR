import CameraCard from "@/components/CameraCard";

export default function Home() {
  
  const cameras = [{name: "STAIRS 1", path: "stairs1"}, 
    {name: "CORRIDOR 2", path: "corridor2"}];

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
              <CameraCard
                key={camera.path}
                camera={camera}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}