"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SyncButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(
    "idle"
  );
  const [detail, setDetail] = useState("");

  async function run() {
    setState("busy");
    setDetail("");
    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Sync failed.");
      }
      if (data.skipped) {
        setDetail(data.reason ?? "Sync skipped.");
      } else {
        setDetail(
          `${data.scanned} scanned, ${data.upserted} new, ${data.pruned} pruned.`
        );
      }
      setState("done");
      router.refresh();
    } catch {
      setState("error");
      setDetail("Sync failed.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={state === "busy"}
        className="rounded-md border border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-900 disabled:opacity-50"
      >
        {state === "busy" ? "Syncing…" : "Sync now"}
      </button>
      {detail && (
        <span className="text-xs text-zinc-500">{detail}</span>
      )}
    </div>
  );
}
