import type { Camera } from "@/types/camera";
import Link from "next/link";
import LivePlayer from "@/components/LivePlayer";

type CameraCardProps = {
  camera: Camera;
  /** null = MediaMTX state unknown (dev/unreachable). */
  live?: boolean | null;
  /**
   * Whether MediaMTX recently produced a segment for this camera.
   * Computed server-side (dashboard) so this client component stays pure.
   */
  recordingActive?: boolean;
};

function formatLastRecording(value?: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export default function CameraCard({
  camera,
  live = null,
  recordingActive = false,
}: CameraCardProps) {

  const dot =
    live === true
      ? "bg-green-500"
      : live === false
        ? "bg-red-500"
        : "bg-zinc-500";
  const label =
    live === true ? "LIVE" : live === false ? "OFFLINE" : "UNKNOWN";

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      {/* Camera header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">
            {camera.name}
          </h3>

          <p className="text-xs text-zinc-500">
            {camera.path}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {recordingActive && (
            <span
              title="Recording (MediaMTX continuous capture)"
              className="rounded border border-red-800 bg-red-950 px-1.5 py-0.5 text-[10px] font-medium text-red-400"
            >
              ● REC
            </span>
          )}
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className="text-xs text-zinc-500">
            {label}
          </span>
        </div>
      </div>

      {/* Live video - connects automatically, muted autoplay. */}
      <LivePlayer path={camera.path} />

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-zinc-800 px-3 py-1.5">
        <span className="truncate text-xs text-zinc-500">
          Last rec: {formatLastRecording(camera.last_recording_at)}
          {typeof camera.recordings_24h === "number" &&
            ` · 24h: ${camera.recordings_24h}`}
        </span>

        <Link
          href={`/cameras/${camera.id}`}
          className="shrink-0 text-xs text-zinc-400 hover:text-white"
        >
          Open →
        </Link>
      </div>
    </div>
  );
}
