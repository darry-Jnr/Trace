"use client";

import { Route, Trash2, ArrowUpRight } from "lucide-react";

interface StopReviewBarProps {
  distance: string;
  onDiscard: () => void;
  onSave: () => void;
}

export default function StopReviewBar({ distance, onDiscard, onSave }: StopReviewBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-5 flex justify-center animate-slide-up-sheet">
      <div className="w-full max-w-[400px] h-14 rounded-xl bg-white/90 backdrop-blur-2xl border border-black/[0.04] shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex items-center justify-between px-4">
        <button
          onClick={onDiscard}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg active:scale-90 transition-all text-red-500"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-[13px] font-semibold">Discard</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/5">
          <Route className="w-3.5 h-3.5 text-black/50" />
          <span className="text-[13px] font-semibold text-black/70 tabular-nums">{distance}</span>
        </div>

        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black text-white active:scale-90 transition-all"
        >
          <span className="text-[13px] font-semibold">Save</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
