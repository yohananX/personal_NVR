import type { Camera } from "@/types/camera";
import Link from "next/link";
import LivePlayer from "@/components/LivePlayer";

type CameraCardProps = {
  camera: Camera;
};

export default function CameraCard({ camera }: CameraCardProps) {
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
          <span className="h-2 w-2 rounded-full bg-zinc-500" />
          <span className="text-xs text-zinc-500">
            OFFLINE
          </span>
        </div>
      </div>

      {/* Video area - click-to-play to keep dashboard CPU low */}
      <LivePlayer path={camera.path} autoPlay={false} />

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2">
        <span className="text-xs text-zinc-500">
          {camera.path}
        </span>

        <Link href={`/cameras/${camera.id}`} className="text-xs text-zinc-400 hover:text-white">
          View
        </Link>
      </div>
    </div>
  );
}