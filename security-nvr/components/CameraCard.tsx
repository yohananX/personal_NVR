import type { Camera } from "@/types/camera";

type CameraCardProps = {
  camera: Camera;
};

export default function CameraCard({ camera }: CameraCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800 px-2 py-1">
        <div>
          <h3 className="text-sm">{camera.name}</h3>
          <p className="text-xs text-zinc-500">{camera.path}</p>
        </div>

        <span className="text-xs text-zinc-500">LIVE</span>
      </div>

      <div className="aspect-video bg-black">
        <iframe
          src={`http://192.168.0.146:8889/${camera.path}`}
          title={`${camera.name} live feed`}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen"
        />
      </div>
    </div>
  );
}