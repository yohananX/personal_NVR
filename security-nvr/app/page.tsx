import CameraCard from "@/components/CameraCard";
import type { Camera } from "@/types/camera";

async function getCameras(): Promise<Camera[]> {
  const response = await fetch("http://localhost:3000/api/cameras", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch cameras");
  }

  return response.json();
}

export default async function Home() {
  const cameras = await getCameras();

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