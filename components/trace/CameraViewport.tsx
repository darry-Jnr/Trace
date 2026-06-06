"use client";

import React, { useRef, useEffect } from "react";

interface CameraViewportProps {
  onPhotoCaptured?: (imageDataUrl: string) => void;
  onClose: () => void;
}

export default function CameraViewport({
  onPhotoCaptured,
  onClose,
}: CameraViewportProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const captureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        onPhotoCaptured?.(dataUrl);
      }
    }
    onClose();
  };

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera hardware pipeline access blocked:", err);
        onClose();
      }
    };

    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
    // Camera starts once on mount; onClose is stable from parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="h-[192px] w-full px-3 pt-3 pb-1 overflow-hidden rounded-t-[30px] animate-fade-in">
        <div className="relative w-full h-full bg-black rounded-[20px] border border-black/[0.08] overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 px-3 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white text-[11px] font-semibold backdrop-blur-md transition"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-between w-full h-12 px-4 animate-fade-in">
        <span className="text-[13px] font-semibold text-black/40 tracking-tight">
          Lens Feed Ready
        </span>
        <button
          onClick={captureSnapshot}
          className="h-11 px-5 rounded-[16px] bg-black text-white text-[13px] font-bold shadow-md hover:bg-neutral-900 active:scale-95 transition"
        >
          Capture Frame
        </button>
      </div>
    </>
  );
}
