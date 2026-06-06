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
  const [dockMode, setDockMode] = useState<"idle" | "recording" | "locked-recording" | "camera">("idle");

  const hasText = inputValue.trim().length > 0;

  const handleSendText = () => {
    if (!inputValue.trim()) return;
    onSendText?.(inputValue.trim());
    setInputValue("");
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full px-4 flex justify-center pointer-events-none animate-fade-in-up">
      <div className="pointer-events-auto relative w-full max-w-[520px]">
        {/* Dynamic Multi-State Interface Frame */}
        <div
          className={`absolute inset-0 rounded-[30px] border border-black/[0.05] bg-white/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-300 ${
            dockMode === "camera" ? "h-[260px] top-[-192px]" : "h-[68px]"
          }`}
        />

        {/* --- INLINE MODE INTERFACE DISPATCHER --- */}
        <div className="relative flex flex-col justify-end">
          {dockMode === "camera" && (
            <CameraViewport
              onPhotoCaptured={onPhotoCaptured}
              onClose={() => setDockMode("idle")}
            />
          )}

          {dockMode !== "camera" && (
            <div className="flex items-center gap-2 h-[68px] px-3">
              {dockMode === "idle" && (
                <>
                  <div className="flex-1 h-12 rounded-[20px] bg-black/[0.03] border border-black/[0.04] flex items-center px-4 transition-all focus-within:bg-white focus-within:border-black/[0.08]">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                      placeholder="Add a note to this place..."
                      className="w-full bg-transparent outline-none border-none text-[14px] font-medium tracking-tight text-black placeholder:text-black/30"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {!hasText ? (
                      <>
                        <VoiceRecorder
                          onAudioRecorded={onAudioRecorded}
                          isActive={false}
                          onStateChange={(state) => setDockMode(state)}
                        />
                        <button
                          onClick={() => setDockMode("camera")}
                          className="w-12 h-12 rounded-[18px] bg-white border border-black/[0.05] shadow-sm flex items-center justify-center active:scale-95 transition-all hover:bg-black/[0.02]"
                          title="Open Live Lens"
                        >
                          <Camera className="w-[19px] h-[19px] text-black/70 stroke-[2.3]" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleSendText}
                        className="w-12 h-12 rounded-[18px] bg-black text-white flex items-center justify-center shadow-md active:scale-95 transition-all hover:scale-[1.02]"
                      >
                        <SendHorizontal className="w-[18px] h-[18px] stroke-[2.5] translate-x-[1px]" />
                      </button>
                    )}
                  </div>
                </>
              )}

              {(dockMode === "recording" || dockMode === "locked-recording") && (
                <VoiceRecorder
                  onAudioRecorded={onAudioRecorded}
                  isActive={true}
                  onStateChange={(state) => setDockMode(state)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}