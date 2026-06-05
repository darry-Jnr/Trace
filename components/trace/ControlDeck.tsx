"use client";

import { Map, Mountain, Plus, MessageSquareMore, Camera, AudioWaveform } from "lucide-react";
import { ViewMode, MediaModalType } from "@/types";

interface ControlDeckProps {
  viewMode: ViewMode;
  isRecording: boolean;
  isAddMenuOpen: boolean;
  onToggleView: () => void;
  onToggleRecord: () => void;
  onToggleAddMenu: () => void;
  onOpenMedia: (type: MediaModalType) => void;
}

export default function ControlDeck({
  viewMode,
  isRecording,
  isAddMenuOpen,
  onToggleView,
  onToggleRecord,
  onToggleAddMenu,
  onOpenMedia,
}: ControlDeckProps) {
  return (
    <div className="absolute right-5 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 items-center">
      <button
        onClick={onToggleView}
        className="w-14 h-14 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl border border-black/[0.04] rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] active:scale-[0.96] transition-all group"
      >
        {viewMode === "flat" ? (
          <Mountain className="w-[18px] h-[18px] text-black/70 group-hover:text-black transition-colors" />
        ) : (
          <Map className="w-[18px] h-[18px] text-black/70 group-hover:text-black transition-colors" />
        )}
        <span className="text-[9px] font-bold tracking-tight uppercase text-black/40 mt-1">
          {viewMode === "flat" ? "3D" : "2D"}
        </span>
      </button>

      <button
        onClick={onToggleRecord}
        className={`w-14 h-14 flex flex-col items-center justify-center rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] active:scale-[0.96] transition-all ${
          isRecording ? "bg-black text-white" : "bg-white border border-black/[0.04] text-[#0052FF]"
        }`}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? "bg-white animate-pulse" : "bg-[#0052FF]"}`} />
        <span className={`text-[9px] font-bold tracking-tight uppercase mt-1.5 ${isRecording ? "text-white/60" : "text-black/50"}`}>
          {isRecording ? "Stop" : "Start"}
        </span>
      </button>

      {isRecording && (
        <div className="flex flex-col gap-2 items-center mt-2 pt-2 border-t border-black/[0.05]">
          <button
            onClick={onToggleAddMenu}
            className={`w-12 h-12 rounded-[16px] flex items-center justify-center shadow-sm transition-all active:scale-95 ${
              isAddMenuOpen ? "bg-black text-white rotate-45" : "bg-white border border-black/[0.04] text-black/60 hover:text-black"
            }`}
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>

          {isAddMenuOpen && (
            <div className="flex flex-col gap-2 p-1.5 bg-white/95 backdrop-blur-xl rounded-[18px] border border-black/[0.04] shadow-md animate-fade-in-up">
              <button onClick={() => onOpenMedia("text")} className="w-9 h-9 rounded-[12px] bg-black/[0.03] hover:bg-[#0052FF] hover:text-white flex items-center justify-center text-black/70 transition-all active:scale-95">
                <MessageSquareMore className="w-4 h-4" />
              </button>
              <button onClick={() => onOpenMedia("image")} className="w-9 h-9 rounded-[12px] bg-black/[0.03] hover:bg-[#0052FF] hover:text-white flex items-center justify-center text-black/70 transition-all active:scale-95">
                <Camera className="w-4 h-4" />
              </button>
              <button onClick={() => onOpenMedia("voice")} className="w-9 h-9 rounded-[12px] bg-black/[0.03] hover:bg-[#0052FF] hover:text-white flex items-center justify-center text-black/70 transition-all active:scale-95">
                <AudioWaveform className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
