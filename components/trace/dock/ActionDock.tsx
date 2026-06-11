"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Camera, SendHorizontal } from "lucide-react";
import VoiceRecorder from "./VoiceRecorder";

const CameraViewport = dynamic(
  () => import("./CameraViewport"),
  { ssr: false }
);

interface ActionDockProps {
  onSendText?: (text: string) => void;
  onAudioRecorded?: (audioBlob: Blob, durationSec: number) => void;
  onPhotoCaptured?: (imageDataUrl: string) => void;
}

export default function ActionDock({
  onSendText,
  onAudioRecorded,
  onPhotoCaptured,
}: ActionDockProps) {
  const [inputValue, setInputValue] = useState("");
  const [dockMode, setDockMode] = useState<
    "idle" | "recording"
  >("idle");
  const [showCamera, setShowCamera] = useState(false);

  const hasText = inputValue.trim().length > 0;

  const handleSendText = () => {
    if (!inputValue.trim()) return;
    onSendText?.(inputValue.trim());
    setInputValue("");
  };

  return (
    <>
      {showCamera && (
        <CameraViewport
          onPhotoCaptured={onPhotoCaptured}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full px-4 flex justify-center pointer-events-none animate-fade-in-up">
        <div className="pointer-events-auto relative w-full max-w-[520px]">
          <div className="rounded-xl border border-black/[0.04] bg-white/80 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <div className="flex items-center h-14 px-3">
              {/* Camera icon — directly on bar */}
              {dockMode === "idle" && (
                <button
                  onClick={() => setShowCamera(true)}
                  className="w-10 h-10 flex items-center justify-center active:scale-90 transition-all shrink-0"
                  title="Open Camera"
                >
                  <Camera className="w-[19px] h-[19px] text-black/50 stroke-[1.6]" />
                </button>
              )}

              {/* Text input — directly on bar, no nested container */}
              {dockMode === "idle" && (
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                  placeholder="Add a note to this place..."
                  className="flex-1 bg-transparent outline-none border-none text-[13px] font-medium tracking-tight text-black/85 placeholder:text-black/25 h-10"
                />
              )}

              {/* Voice recorder — always mounted, manages own state */}
              <div className={`flex items-center gap-2 ${dockMode === "idle" && hasText ? "hidden" : ""}`}>
                <div className="w-[1px] h-5 bg-black/[0.06]" />
                <VoiceRecorder
                  onAudioRecorded={onAudioRecorded}
                  onStateChange={(state) => setDockMode(state)}
                />
              </div>

              {/* Send button */}
              {dockMode === "idle" && hasText && (
                <div className="flex items-center gap-2">
                  <div className="w-[1px] h-5 bg-black/[0.06]" />
                  <button
                    onClick={handleSendText}
                    className="w-10 h-10 flex items-center justify-center active:scale-90 transition-all shrink-0"
                  >
                    <SendHorizontal className="w-[18px] h-[18px] text-black/80 stroke-[1.8]" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
