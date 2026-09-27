"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

type Camera = {
  id: number;
  name: string;
  path: string;
  created_at: string;
};

export default function CamerasPage() {
  const router = useRouter();
  const [cameras, setCameras] = useState<Camera[]>([]);

  const [name, setName] = useState("");
  const [path, setPath] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/cameras");
        if (cancelled) return;
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          throw new Error("Failed to load cameras.");
        }
        const data = await response.json();
        if (!cancelled) setCameras(data);
      } catch {
        if (!cancelled) setError("Unable to load cameras.");
      }
    };
    const loadRole = async () => {
      try {
        const r = await fetch("/api/auth/me");
        if (!r.ok || cancelled) return;
        const me = await r.json();
        if (!cancelled && me?.role) setRole(me.role);
      } catch {
        // Role stays unknown - mutations will 401/403 with a message.
      }
    };
    void load();
    void loadRole();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function reloadCameras(): Promise<boolean> {
    try {
      const response = await fetch("/api/cameras");
      if (response.status === 401) {
        router.replace("/login");
        return false;
      }
      if (!response.ok) {
        throw new Error("Failed to load cameras.");
      }
      const data = await response.json();
      setCameras(data);
      return true;
    } catch {
      setError("Unable to load cameras.");
      return false;
    }
  }

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
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        setError(data.error || "Failed to save camera.");
        return;
      }

      setName("");
      setPath("");
      setEditingId(null);

      await reloadCameras();
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
      "Are you sure you want to delete this camera? Its recording history stays on disk until retention prunes it."
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
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        setError(data.error || "Failed to delete camera.");
        return;
      }

      if (editingId === id) {
        cancelEditing();
      }

      await reloadCameras();
    } catch {
      setError("Unable to connect to the server.");
    }
  }

  // Client-side gating only - the API enforces ADMIN for mutations.
  // While the role is still loading (null) the form stays visible so an
  // ADMIN never gets locked out of their own management page.
  const canManage = role !== "OPERATOR";

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-4 py-3 md:px-6 md:py-4">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Dashboard
        </Link>

        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              CAMERA MANAGEMENT
            </h1>

            <p className="text-sm text-zinc-400">
              Add and manage CCTV cameras
            </p>
          </div>

          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-3xl p-4 md:p-6">
        {canManage && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 md:p-6">
            <h2 className="text-lg font-medium">
              {editingId ? "Edit Camera" : "Add Camera"}
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Path is the MediaMTX stream name (e.g. stairs1) — not the
              camera&apos;s RTSP URL.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Camera Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="e.g. Stairs Camera"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  MediaMTX Stream Path
                </label>

                <input
                  type="text"
                  value={path}
                  onChange={(event) =>
                    setPath(event.target.value)
                  }
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

        <div className={canManage ? "mt-8" : ""}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-medium">
              Configured Cameras
            </h2>

            <span className="text-xs text-zinc-500">
              {cameras.length} camera
              {cameras.length !== 1 ? "s" : ""}
            </span>
          </div>

          {!canManage && error && (
            <p className="mt-3 text-sm text-red-400">
              {error}
            </p>
          )}

          {cameras.length === 0 ? (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm text-zinc-500">
                No cameras configured.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
              {cameras.map((camera) => (
                <div
                  key={camera.id}
                  className="flex items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900 px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">
                      {camera.name}
                    </h3>

                    <p className="mt-0.5 font-mono text-sm text-zinc-500">
                      {camera.path}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      href={`/cameras/${camera.id}`}
                      className="text-sm text-zinc-300 hover:text-white"
                    >
                      Open
                    </Link>

                    {canManage && (
                      <>
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
                      </>
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
