"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getWhepUrl } from "@/lib/mediamtx";

type LivePlayerProps = {
  path: string;
  autoPlay?: boolean;
};

type Status = "idle" | "loading" | "live" | "error" | "unconfigured";

export default function LivePlayer({
  path,
  autoPlay = true,
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const [status, setStatus] = useState<Status>(
    autoPlay ? "loading" : "idle"
  );
  const [message, setMessage] = useState("");

  const stop = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const start = useCallback(async () => {
    const whepUrl = getWhepUrl(path);

    if (!whepUrl) {
      setStatus("unconfigured");
      return;
    }

    stop();
    setStatus("loading");
    setMessage("");

    try {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus("live");
        } else if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          setStatus("error");
          setMessage(
            "Connection lost. Camera may be offline."
          );
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch(whepUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!response.ok) {
        throw new Error(`WHEP rejected (${response.status})`);
      }

      const answerSdp = await response.text();
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });
    } catch (error) {
      console.error("Live playback failed:", error);
      stop();
      setStatus("error");
      setMessage(
        "Cannot reach live feed. Camera offline or MediaMTX unreachable."
      );
    }
  }, [path, stop]);

  useEffect(() => {
    if (autoPlay) {
      start();
    }
    return () => stop();
  }, [autoPlay, start, stop]);

  function handleFullscreen() {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  }

  if (status === "unconfigured") {
    return (
      <div className="flex aspect-video flex-col items-center justify-center bg-black text-center">
        <p className="text-sm text-zinc-500">
          Live preview not configured
        </p>
        <p className="mt-1 max-w-xs text-xs text-zinc-700">
          Set NEXT_PUBLIC_MEDIAMTX_BASE on ghis.
          Dev PC shows this placeholder.
        </p>
        <p className="mt-2 text-xs text-zinc-600">path: {path}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black"
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        controls={status === "live"}
        className="h-full w-full object-contain"
      />

      {status !== "live" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center">
          {status === "idle" && (
            <>
              <p className="text-sm text-zinc-500">
                Live feed ready
              </p>
              <button
                type="button"
                onClick={start}
                className="mt-3 rounded-md bg-white px-4 py-2 text-sm font-medium text-black"
              >
                ▶ Play live
              </button>
            </>
          )}

          {status === "loading" && (
            <p className="text-sm text-zinc-400">
              Connecting to {path}…
            </p>
          )}

          {status === "error" && (
            <>
              <p className="text-sm text-zinc-400">
                Camera feed unavailable
              </p>
              <p className="mt-1 max-w-xs text-xs text-zinc-600">
                {message}
              </p>
              <button
                type="button"
                onClick={start}
                className="mt-3 rounded-md border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}

      {status === "live" && (
        <button
          type="button"
          onClick={handleFullscreen}
          className="absolute right-2 top-2 rounded-md border border-zinc-700 bg-black/60 px-3 py-1 text-xs hover:bg-zinc-800"
        >
          Fullscreen
        </button>
      )}
    </div>
  );
}
