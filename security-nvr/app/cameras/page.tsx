"use client";

import { FormEvent, useState } from "react";

export default function CamerasPage() {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, SetIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    SetIsSubmitting(true);

    try{
      const response = await fetch("/api/cameras",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
        },
        body:JSON.stringify({
          name, 
          path,
        }),
      });
      const data = await response.json();

      if(!response.ok){
        setError(data.error || "Failed to add camera.");
        return;
      }
      console.log("Camera Created:", data)
        
    setName("");
    setPath("");
  } catch {
    setError("Unable to connect to the server.");
  } finally{
    SetIsSubmitting(false);
  }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-semibold">CAMERA MANAGEMENT</h1>
        <p className="text-sm text-zinc-400">
          Add and manage CCTV cameras
        </p>
      </header>

      <section className="p-6">
        <div className="max-w-xl rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-6 text-lg font-medium">Add Camera</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Camera Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. LOBBY 1"
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Stream Path
              </label>

              <input
                type="text"
                value={path}
                onChange={(event) => setPath(event.target.value)}
                placeholder="e.g. http://ipaddress:port/camera_name"
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none"
              />
            </div>

            { error && (
              <p className = "text-sm text-red-400">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled = {isSubmitting}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black"
            >
              {isSubmitting ? "Adding...": "Add Camera"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}