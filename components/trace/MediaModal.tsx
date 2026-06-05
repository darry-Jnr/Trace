"use client";

import { X, MessageSquareMore, Camera, AudioWaveform } from "lucide-react";
import { MediaModalType } from "@/types";

interface MediaModalProps {
  mediaModal: MediaModalType;
  mediaInputText: string;
  onSetMediaInputText: (text: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function MediaModal({
  mediaModal,
  mediaInputText,
  onSetMediaInputText,
  onClose,
  onSave,
}: MediaModalProps) {
  if (!mediaModal) return null;

  return (
    <div className="absolute inset-0 bg-black/15 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 transition-all duration-300">
      <div className="bg-white w-full md:max-w-sm rounded-t-[32px] md:rounded-[28px] border-t md:border border-black/[0.04] shadow-[0_-8px_30px_rgba(0,0,0,0.06),0_24px_60px_rgba(0,0,0,0.08)] p-6 pb-10 md:pb-6 relative animate-slide-up-sheet md:animate-scale-up-modal overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 text-black/30 hover:text-black w-6 h-6 flex items-center justify-center rounded-full bg-black/[0.03]">
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
        
        <h3 className="text-sm font-semibold tracking-tight text-black capitalize mb-4 flex items-center gap-2">
          {mediaModal === "text" && <MessageSquareMore className="w-4 h-4 text-[#0052FF]" />}
          {mediaModal === "image" && <Camera className="w-4 h-4 text-[#0052FF]" />}
          {mediaModal === "voice" && <AudioWaveform className="w-4 h-4 text-[#0052FF]" />}
          Attach {mediaModal} Point
        </h3>

        {mediaModal === "text" ? (
          <textarea
            value={mediaInputText}
            onChange={(e) => onSetMediaInputText(e.target.value)}
            placeholder="Leave context directions at this exact moment..."
            className="w-full h-24 p-3.5 bg-black/[0.02] border border-black/10 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0052FF] text-black resize-none tracking-tight leading-normal"
          />
        ) : (
          <div className="p-8 border border-dashed border-black/10 rounded-xl bg-black/[0.01] flex flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold text-black/60 tracking-tight">Hardware device telemetry stream ready</p>
            <p className="text-[11px] font-medium text-black/35 mt-0.5 tracking-tight">Ready for {mediaModal} stream sync injection</p>
          </div>
        )}

        <button onClick={onSave} className="mt-4 w-full h-11 rounded-[14px] bg-black text-white text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]">
          Pin onto Line Trail
        </button>
      </div>
    </div>
  );
}
