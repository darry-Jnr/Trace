"use client";

import React, { useState } from "react";
import { Camera, SendHorizontal } from "lucide-react";
import VoiceRecorder from "./VoiceRecorder";
import CameraViewport from "./CameraViewport";

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
    "idle" | "recording" | "locked-recording"
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
          {/* Accent glow line */}
          <div className="absolute -top-[1px] left-8 right-8 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#0052FF]/40 to-transparent animate-fade-in" />
          <div className="absolute -top-[1px] left-12 right-12 h-[4px] rounded-full bg-gradient-to-r from-transparent via-[#0052FF]/15 blur-sm to-transparent animate-fade-in" />
          <div className="absolute inset-0 rounded-[30px] border border-black/[0.035] bg-white/72 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.045)] h-[68px]" />

          <div className="relative flex flex-col justify-end">
            <div className="flex items-center gap-2 h-[68px] px-3">
              {/* Idle extras — camera + input */}
              {dockMode === "idle" && (
                <>
                  <button
                    onClick={() => setShowCamera(true)}
                    className="w-11 h-11 rounded-[16px] bg-white/60 border border-black/[0.03] flex items-center justify-center active:scale-95 transition-all hover:border-[#0052FF]/30 shrink-0 group"
                    title="Open Camera"
                  >
                    <Camera className="w-[18px] h-[18px] text-black/60 stroke-[1.9] group-hover:text-[#0052FF]/60 transition-colors" />
                  </button>

                  <div className="flex-1 h-11 rounded-[18px] bg-black/[0.025] border border-black/[0.03] flex items-center px-4 transition-all focus-within:bg-white/70 focus-within:border-[#0052FF]/30 focus-within:shadow-[0_0_0_3px_rgba(0,82,255,0.08)]">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSendText()
                      }
                      placeholder="Add a note to this place..."
                      className="w-full bg-transparent outline-none border-none text-[14px] font-medium tracking-tight text-black/85 placeholder:text-black/25"
                    />
                  </div>
                </>
              )}

              {/* VoiceRecorder — always mounted, manages own state.
                  Visually hidden when idle + hasText so the send button appears instead. */}
              <div className={dockMode === "idle" && hasText ? "hidden" : ""}>
                <VoiceRecorder
                  onAudioRecorded={onAudioRecorded}
                  onStateChange={(state) => setDockMode(state)}
                />
              </div>

              {/* Send button only shown when idle + hasText */}
              {dockMode === "idle" && hasText && (
                <button
                  onClick={handleSendText}
                  className="w-11 h-11 rounded-[16px] bg-black text-white flex items-center justify-center active:scale-95 transition-all shrink-0"
                >
                  <SendHorizontal className="w-[17px] h-[17px] stroke-[2]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
