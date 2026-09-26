"use client";

import { useRef, useState } from "react";
import { getRecordingPlaybackUrl } from "@/lib/mediamtx";

type RecordingPlayerProps = {
  cameraPath: string;
  startedAt: string;
  endedAt: string;
  filePath: string;
};

export default function RecordingPlayer({
  cameraPath,
  startedAt,
  endedAt,
  filePath,
}: RecordingPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const url = getRecordingPlaybackUrl(
    cameraPath,
    startedAt,
    endedAt
  );

  function handleFullscreen() {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  }

  if (!url) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center bg-black text-center">
        <p className="text-sm text-zinc-500">
          Recording playback not configured
        </p>
        <p className="mt-1 max-w-xs text-xs text-zinc-700">
          Set NEXT_PUBLIC_MEDIAMTX_PLAYBACK_BASE on ghis.
          Dev PC shows this placeholder.
        </p>
        <p className="mt-2 max-w-md truncate text-xs text-zinc-600">
          {filePath}
        </p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center bg-black text-center">
        <p className="text-sm text-zinc-400">
          Recording unavailable
        </p>
        <p className="mt-1 max-w-xs text-xs text-zinc-600">
          MediaMTX has no segment for this timespan
          (retention is ~1 day) or playback is unreachable.
        </p>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setRetryKey((k) => k + 1);
          }}
          className="mt-3 rounded-md border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black"
    >
      <video
        key={retryKey}
        controls
        preload="metadata"
        playsInline
        src={url}
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
      <button
        type="button"
        onClick={handleFullscreen}
        className="absolute right-2 top-2 rounded-md border border-zinc-700 bg-black/60 px-3 py-1 text-xs hover:bg-zinc-800"
      >
        Fullscreen
      </button>
    </div>
  );
}
