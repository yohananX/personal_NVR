"use client";

import { FormEvent, useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";

type Camera = {
  id: number;
  name: string;
  path: string;
  created_at: string;
};

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);

  const [name, setName] = useState("");
  const [path, setPath] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  async function loadCameras() {
    try {
      const response = await fetch("/api/cameras");

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load cameras.");
      }

      const data = await response.json();
      setCameras(data);
    } catch {
      setError("Unable to load cameras.");
    }
  }

  useEffect(() => {
    loadCameras();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (me?.role) setRole(me.role);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const url = editingId
        ? `/api/cameras/${editingId}`
        : "/api/cameras";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          path,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        setError(data.error || "Failed to save camera.");
        return;
      }

      setName("");
      setPath("");
      setEditingId(null);

      await loadCameras();
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditing(camera: Camera) {
    setEditingId(camera.id);
    setName(camera.name);
    setPath(camera.path);
    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setName("");
    setPath("");
    setError("");
  }

  async function deleteCamera(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this camera?"
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const response = await fetch(`/api/cameras/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        setError(data.error || "Failed to delete camera.");
        return;
      }

      if (editingId === id) {
        cancelEditing();
      }

      await loadCameras();
    } catch {
      setError("Unable to connect to the server.");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">CAMERA MANAGEMENT</h1>

          <p className="text-sm text-zinc-400">
            Add and manage CCTV cameras
          </p>
        </div>

        <LogoutButton />
      </header>

      <section className="grid gap-6 p-6 lg:grid-cols-2">
        {role !== "OPERATOR" && (
        <div className="max-w-xl rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-6 text-lg font-medium">
            {editingId ? "Edit Camera" : "Add Camera"}
          </h2>

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
                placeholder="e.g. stairs1"
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Add Camera"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded-md border border-zinc-700 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        )}

        <div>
          <h2 className="mb-4 text-lg font-medium">
            Configured Cameras
          </h2>

          {cameras.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm text-zinc-500">
                No cameras configured.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cameras.map((camera) => (
                <div
                  key={camera.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium">
                        {camera.name}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-500">
                        {camera.path}
                      </p>
                    </div>

                    {role !== "OPERATOR" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(camera)}
                        className="text-sm text-zinc-300 hover:text-white"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteCamera(camera.id)}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}