"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Camera, RotateCcw, Check } from "lucide-react";

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
  const onCloseRef = useRef(onClose);
  const [preview, setPreview] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flash, setFlash] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    cleanup();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera hardware pipeline access blocked:", err);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCameraError("Camera access denied. Please allow camera permissions in your browser settings.");
      } else if (err?.name === "NotFoundError") {
        setCameraError("No camera found on this device.");
      } else {
        setCameraError("Could not open camera. Please try again.");
      }
    }
  }, [cleanup]);

  useEffect(() => {
    startCamera(facingMode);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const captureSnapshot = useCallback(() => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (facingMode === "user") {
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
        } else {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        }
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        setPreview(dataUrl);
        setFlash(true);
        setTimeout(() => setFlash(false), 200);
      }
    }
  }, [facingMode]);

  const confirmPhoto = useCallback(() => {
    if (preview) {
      onPhotoCaptured?.(preview);
    }
    cleanup();
    onCloseRef.current();
  }, [preview, onPhotoCaptured, cleanup]);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    setPreview(null);
  }, []);

  const retakePhoto = useCallback(() => {
    setPreview(null);
  }, []);

  // Permission denied / camera unavailable error state
  if (cameraError) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center gap-4 p-8 animate-fade-in">
        <Camera className="w-12 h-12 text-white/40" />
        <p className="text-white/70 text-center text-sm max-w-xs">{cameraError}</p>
        <button
          onClick={() => { cleanup(); onCloseRef.current(); }}
          className="px-6 h-11 rounded-full bg-white/20 backdrop-blur-md text-white text-sm font-medium active:scale-95 transition"
        >
          Close
        </button>
      </div>
    );
  }

  // Fullscreen preview after capture
  if (preview) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-fade-in">
        <img
          src={preview}
          alt="Captured"
          className="flex-1 w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 flex items-center justify-center gap-6">
          <button
            onClick={retakePhoto}
            className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center active:scale-90 transition"
          >
            <RotateCcw className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={confirmPhoto}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center active:scale-90 transition shadow-lg"
          >
            <Check className="w-8 h-8 text-black stroke-[2.5]" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-fade-in">
      {/* Flash overlay */}
      {flash && <div className="absolute inset-0 bg-white z-10 animate-fade-in pointer-events-none" />}

      {/* Camera preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`flex-1 w-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-12 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={() => { cleanup(); onCloseRef.current(); }}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center active:scale-90 transition"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <span className="text-white/80 text-sm font-semibold tracking-tight">Photo</span>
        <button
          onClick={toggleCamera}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center active:scale-90 transition"
        >
          <RotateCcw className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Bottom capture button */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 flex items-center justify-center bg-gradient-to-t from-black/50 to-transparent">
        <button
          onClick={captureSnapshot}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition"
        >
          <div className="w-16 h-16 rounded-full bg-white" />
        </button>
      </div>
    </div>
  );
}
