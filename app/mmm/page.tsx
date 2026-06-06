"use client";

import React from "react";
import {
  Camera,
  Mic,
  MessageSquareMore,
} from "lucide-react";

interface ActionDockProps {
  onCameraTrigger?: () => void;
  onMicTrigger?: () => void;
  onTextTrigger?: () => void;
}

export default function ActionDock({  
  onCameraTrigger,
  onMicTrigger,
  onTextTrigger,
}: ActionDockProps) {

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full px-4 flex justify-center pointer-events-none">

      {/* Dock */}
      <div className="pointer-events-auto relative flex items-center gap-3 px-3 py-3 rounded-[30px] border border-black/[0.05] bg-white/75 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)]">

        {/* Soft top light */}
        <div className="absolute inset-0 rounded-[30px] bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />

        {/* Note */}
        <button
          onClick={onTextTrigger}
          className="group relative flex flex-col items-center justify-center gap-1 w-[72px] active:scale-95 transition-all duration-200"
        >
          <div className="w-12 h-12 rounded-[18px] bg-white border border-black/[0.04] shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center transition-all duration-200 group-hover:bg-black/[0.02] group-hover:-translate-y-0.5">
            <MessageSquareMore className="w-[19px] h-[19px] text-black/70 stroke-[2.3]" />
          </div>

          <span className="text-[10px] font-semibold tracking-tight text-black/40">
            Note
          </span>
        </button>

        {/* Voice */}
        <button
          onClick={onMicTrigger}
          className="group relative flex flex-col items-center justify-center gap-1 w-[72px] active:scale-95 transition-all duration-200"
        >
          <div className="w-12 h-12 rounded-[18px] bg-white border border-black/[0.04] shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center transition-all duration-200 group-hover:bg-black/[0.02] group-hover:-translate-y-0.5">
            <Mic className="w-[19px] h-[19px] text-black/70 stroke-[2.3]" />
          </div>

          <span className="text-[10px] font-semibold tracking-tight text-black/40">
            Voice
          </span>
        </button>

        {/* Camera */}
        <button
          onClick={onCameraTrigger}
          className="group relative flex flex-col items-center justify-center gap-1 w-[72px] active:scale-95 transition-all duration-200"
        >
          <div className="w-12 h-12 rounded-[18px] bg-white border border-black/[0.04] shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center transition-all duration-200 group-hover:bg-black/[0.02] group-hover:-translate-y-0.5">
            <Camera className="w-[19px] h-[19px] text-black/70 stroke-[2.3]" />
          </div>

          <span className="text-[10px] font-semibold tracking-tight text-black/40">
            Photo
          </span>
        </button>

      </div>
    </div>
  );
}