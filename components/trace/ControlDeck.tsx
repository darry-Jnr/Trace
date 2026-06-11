"use client";

import React from "react";
import {
  Map,
  Mountain,
  Plus,
  Square,
  Circle,
} from "lucide-react";

import ActionDock from "./dock/ActionDock";
import { ViewMode } from "@/types";

interface ControlDeckProps {
  viewMode: ViewMode;
  isRecording: boolean;
  isAddMenuOpen: boolean;
  onToggleView: () => void;
  onToggleRecord: () => void;
  onToggleAddMenu: () => void;
  onSendText?: (text: string) => void;
  onAudioRecorded?: (audioBlob: Blob, durationSec: number) => void;
  onPhotoCaptured?: (imageDataUrl: string) => void;
}

export default function ControlDeck({
  viewMode,
  isRecording,
  isAddMenuOpen,
  onToggleView,
  onToggleRecord,
  onToggleAddMenu,
  onSendText,
  onAudioRecorded,
  onPhotoCaptured,
}: ControlDeckProps) {
  return (
    <>
      {/* Map View Toggle — top-right */}
      <button
        onClick={onToggleView}
        className="group absolute top-5 right-5 z-40 w-10 h-10 rounded-xl bg-white/80 backdrop-blur-2xl border border-black/[0.05] shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-90 transition-all duration-200 hover:bg-white"
        title={viewMode === "flat" ? "Switch to 3D" : "Switch to 2D"}
      >
        {viewMode === "flat" ? (
          <Mountain className="w-[18px] h-[18px] text-black/50 group-hover:text-black transition-colors duration-200" />
        ) : (
          <Map className="w-[18px] h-[18px] text-black/50 group-hover:text-black transition-colors duration-200" />
        )}
      </button>

      {/* Floating Side Controls — right */}
      <div className="absolute right-5 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3">

        {/* Start / Stop */}
        <div className="relative">
          {/* Recording glow ring */}
          {isRecording && (
            <div className="absolute inset-[-6px] rounded-xl bg-red-500/10 animate-ping pointer-events-none" style={{ animationDuration: "1.5s" }} />
          )}
          <button
            onClick={onToggleRecord}
            className={`group relative w-[58px] h-[58px] rounded-xl backdrop-blur-2xl border flex flex-col items-center justify-center active:scale-[0.96] transition-all duration-200 overflow-hidden ${
              isRecording
                ? "bg-black border-black text-white shadow-[0_0_24px_rgba(255,59,48,0.35)]"
                : "bg-white/80 border-black/[0.05] text-black shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
            }`}
          >
          {/* Reflection */}
          <div
            className={`absolute inset-0 pointer-events-none ${
              isRecording
                ? "bg-gradient-to-b from-white/10 to-transparent"
                : "bg-gradient-to-b from-white/60 to-transparent"
            }`}
          />

          {isRecording ? (
            <Square className="w-[15px] h-[15px] fill-white text-white" />
          ) : (
            <Circle className="w-[15px] h-[15px] fill-black text-black" />
          )}

          <span
            className={`mt-1 text-[9px] font-semibold tracking-tight ${
              isRecording ? "text-white/55" : "text-black/40"
            }`}
          >
            {isRecording ? "Stop" : "Start"}
          </span>
        </button>
        </div>

        {/* Add Button */}
        {isRecording && (
          <button
            onClick={onToggleAddMenu}
            className={`group relative mt-1 w-[52px] h-[52px] rounded-xl backdrop-blur-2xl border shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-[0.96] transition-all duration-300 overflow-hidden ${
              isAddMenuOpen
                ? "bg-black border-black text-white rotate-45"
                : "bg-white/80 border-black/[0.05] text-black/65"
            }`}
          >
            {/* Reflection */}
            <div
              className={`absolute inset-0 pointer-events-none ${
                isAddMenuOpen
                  ? "bg-gradient-to-b from-white/10 to-transparent"
                  : "bg-gradient-to-b from-white/60 to-transparent"
              }`}
            />

            <Plus className="w-[20px] h-[20px] stroke-[2.4]" />
          </button>
        )}
      </div>

      {/* Bottom Action Dock */}
      {isRecording && isAddMenuOpen && (
        <ActionDock
          onSendText={onSendText}
          onAudioRecorded={onAudioRecorded}
          onPhotoCaptured={onPhotoCaptured}
        />
      )}
    </>
  );
}