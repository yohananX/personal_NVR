import type { Camera } from "@/types/camera";
import Link from "next/link";
import LivePlayer from "@/components/LivePlayer";

type CameraCardProps = {
  camera: Camera;
  /** null = MediaMTX state unknown (dev/unreachable). */
  live?: boolean | null;
};

const RECENT_MS = 70 * 60 * 1000;

function formatLastRecording(value?: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export default function CameraCard({
  camera,
  live = null,
}: CameraCardProps) {
  const recording =
    camera.last_recording_at &&
    Date.now() - new Date(camera.last_recording_at).getTime() <
      RECENT_MS;

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
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">
            {camera.name}
          </h3>

          <p className="text-xs text-zinc-500">
            {camera.path}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {recording && (
            <span className="rounded border border-red-800 bg-red-950 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
              REC
            </span>
          )}
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className="text-xs text-zinc-500">
            {label}
          </span>
        </div>
      </div>

      {/* Video area - click-to-play to keep dashboard CPU low */}
      <LivePlayer path={camera.path} autoPlay={false} />

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-zinc-800 px-4 py-2">
        <span className="truncate text-xs text-zinc-500">
          Last rec: {formatLastRecording(camera.last_recording_at)}
          {typeof camera.recordings_24h === "number" &&
            ` · 24h: ${camera.recordings_24h}`}
        </span>

        <Link href={`/cameras/${camera.id}`} className="shrink-0 text-xs text-zinc-400 hover:text-white">
          View
        </Link>
      </div>
    </div>
  );
}
