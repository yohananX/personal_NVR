"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RecordingDeleteButtonProps = {
  id: number;
  startedAt: string;
  /** Where to go after deletion (e.g. the camera page). Defaults to refreshing the current list. */
  redirectTo?: string;
};

/**
 * Real deletion: confirmation -> DELETE /api/recordings/:id (ADMIN only),
 * which removes BOTH the segment file and the PostgreSQL row, then
 * refreshes the list. Rendered only for ADMIN callers.
 */
export default function RecordingDeleteButton({
  id,
  startedAt,
  redirectTo,
}: RecordingDeleteButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const label = new Date(startedAt).toLocaleString();
    const confirmed = window.confirm(
      `Delete the recording from ${label}?\n\nThis removes the video file and its database entry. This cannot be undone.`
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/recordings/${id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Failed to delete recording.");
        return;
      }
      if (redirectTo) {
        router.replace(redirectTo);
      }
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </span>
  );
}
