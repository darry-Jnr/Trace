"use client";

import React from "react";
import {
  ChevronLeft,
  Navigation,
  MapPin,
  Volume2,
  Camera,
  FileText,
  Calendar,
  Route,
  Footprints,
  CheckCircle2,
} from "lucide-react";
import { WaypointMedia } from "@/types";

interface ReplayOverlayProps {
  title: string;
  date: string;
  distance: string;
  onBack: () => void;

  isSynced: boolean;
  hasStarted: boolean;
  distanceToStart: number | null;
  unlockedWaypoints: WaypointMedia[];
  activeWaypoint: WaypointMedia | null;
  onStartGuidance: () => void;
  onDismissWaypoint: () => void;
}

function formatDist(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export default function ReplayOverlay({
  title,
  date,
  distance,
  onBack,
  isSynced,
  hasStarted,
  distanceToStart,
  unlockedWaypoints,
  activeWaypoint,
  onStartGuidance,
  onDismissWaypoint,
}: ReplayOverlayProps) {
  const iconMap = { text: FileText, image: Camera, voice: Volume2 };
  const labelMap = { text: "Note", image: "Photo", voice: "Voice Memo" };

  return (
    <div className="fixed inset-y-0 right-0 z-[90] hidden md:flex md:w-[380px] bg-[#f5f5f7] border-l border-black/[0.04] flex-col select-none shadow-[-20px_0_60px_rgba(0,0,0,0.04)]">

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-black/[0.02] blur-3xl" />
      </div>

      <header className="relative z-10 p-5 border-b border-black/[0.04] bg-[#f5f5f7]/80 backdrop-blur-md shrink-0">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-black/[0.06] text-black/60 hover:text-black text-xs font-semibold shadow-sm active:scale-95 transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Dashboard
        </button>

        <div className="mt-5">
          <h2 className="text-[20px] font-bold tracking-tight text-black leading-snug">
            {title}
          </h2>
          <div className="flex items-center gap-3 mt-2">
            {date && (
              <div className="flex items-center gap-1 text-black/40">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[12px] font-medium">{date}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-black/40">
              <Route className="w-3.5 h-3.5" />
              <span className="text-[12px] font-medium">{distance}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex flex-col p-5 overflow-y-auto">

        {!hasStarted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center">
              <Footprints className="w-7 h-7 text-black/40" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-black/80">Find the start point</p>
              <p className="text-[13px] text-black/40 mt-1 leading-relaxed">
                Walk toward the blue dot on the map to begin the route.
              </p>
            </div>

            {distanceToStart !== null && (
              <div className="bg-white rounded-2xl border border-black/[0.04] px-5 py-3 shadow-sm">
                <p className="text-[12px] text-black/40 font-medium">Distance to start</p>
                <p className="text-[22px] font-bold text-black tracking-tight">{formatDist(distanceToStart)}</p>
              </div>
            )}

            {isSynced ? (
              <button
                onClick={onStartGuidance}
                className="w-full h-13 rounded-[20px] bg-black text-white flex items-center justify-center gap-2 text-[14px] font-semibold tracking-tight shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all animate-fade-in"
              >
                <CheckCircle2 className="w-4 h-4" />
                Start Trace
              </button>
            ) : (
              <div className="bg-black/5 rounded-2xl px-5 py-3 flex items-center gap-2.5 opacity-60">
                <div className="w-3 h-3 rounded-full bg-[#0052FF]" />
                <p className="text-[12px] font-medium text-black/50">Find the blue dot to start</p>
              </div>
            )}
          </div>

        ) : (
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-black/[0.04] px-5 py-4 shadow-sm flex items-center gap-3">
              <Navigation className="w-5 h-5 text-black/40" />
              <p className="text-[13px] font-semibold text-black/60">Following the route</p>
            </div>

            {activeWaypoint && (
              <div className="animate-fade-in-up bg-black text-white rounded-2xl p-4 shadow-lg relative">
                <button
                  onClick={onDismissWaypoint}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-white/70 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-[10px] bg-white/15 flex items-center justify-center">
                    {React.createElement(iconMap[activeWaypoint.type] || MapPin, { className: "w-4 h-4 text-white" })}
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                    {activeWaypoint.category || labelMap[activeWaypoint.type] || "Moment"}
                  </p>
                </div>
                <p className="text-[14px] font-semibold leading-snug">
                  {activeWaypoint.type === "image" ? "Photo Moment" : activeWaypoint.content}
                </p>
                {activeWaypoint.type === "voice" && activeWaypoint.fileUrl && (
                  <audio controls src={activeWaypoint.fileUrl} className="mt-3 w-full h-9 rounded-lg" />
                )}
                {activeWaypoint.type === "image" && activeWaypoint.fileUrl && (
                  <img src={activeWaypoint.fileUrl} alt="" className="mt-3 w-full rounded-xl object-cover max-h-48" />
                )}
              </div>
            )}

            <div className="mt-2">
              <p className="text-[11px] font-bold text-black/30 uppercase tracking-widest mb-3">
                Discovered along this route
                <span className="ml-1.5 font-semibold text-black/50">
                  ({unlockedWaypoints.length})
                </span>
              </p>

              <div className="space-y-2">
                {unlockedWaypoints.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-black/10 rounded-[20px] bg-white/50">
                    <MapPin className="w-5 h-5 text-black/20 mx-auto mb-1.5" />
                    <p className="text-[13px] text-black/40 font-medium">
                      No moments discovered yet. Keep walking!
                    </p>
                  </div>
                ) : (
                  [...unlockedWaypoints].reverse().map((wp) => {
                    const Icon = iconMap[wp.type] ?? MapPin;
                    const label = labelMap[wp.type] ?? "Moment";

                    return (
                      <div
                        key={wp.id}
                        className="w-full flex items-center gap-3 p-3.5 rounded-[18px] bg-white border border-black/[0.04]"
                      >
                        <div className="w-9 h-9 rounded-[12px] bg-black/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-black/50" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-black/30 leading-none mb-0.5">
                            {wp.category || label}
                          </p>
                          <p className="text-[12px] font-semibold text-black/60 leading-snug truncate">
                            {wp.type === "image" ? "Photo Moment" : wp.content}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
