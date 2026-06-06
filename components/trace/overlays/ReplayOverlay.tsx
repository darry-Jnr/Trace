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
} from "lucide-react";
import { WaypointMedia } from "@/types";

interface ReplayOverlayProps {
  title: string;
  date: string;
  distance: string;
  waypoints: WaypointMedia[];
  onBack: () => void;
  onFollow: () => void;
  onWaypointSelect: (waypoint: WaypointMedia) => void;
  activeWaypointId?: string;
}

export default function ReplayOverlay({
  title,
  date,
  distance,
  waypoints,
  onBack,
  onFollow,
  onWaypointSelect,
  activeWaypointId,
}: ReplayOverlayProps) {
  const iconMap = {
    text: FileText,
    image: Camera,
    voice: Volume2,
  };

  const labelMap = {
    text: "Note",
    image: "Photo",
    voice: "Voice Memo",
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[90] w-full md:w-[380px] bg-[#f5f5f7] border-l border-black/[0.04] flex flex-col select-none shadow-[-20px_0_60px_rgba(0,0,0,0.04)]">

      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-black/[0.02] blur-3xl" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 p-5 border-b border-black/[0.04] bg-[#f5f5f7]/80 backdrop-blur-md">

        {/* Back button */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-black/[0.06] text-black/60 hover:text-black text-xs font-semibold shadow-sm active:scale-95 transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Dashboard
        </button>

        {/* Title + meta */}
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

        {/* Follow Route CTA */}
        <button
          onClick={onFollow}
          className="mt-5 w-full h-13 rounded-[20px] bg-black text-white flex items-center justify-center gap-2 text-[14px] font-semibold tracking-tight shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all"
        >
          <Navigation className="w-4 h-4" />
          Follow Route
        </button>
      </header>

      {/* ── Moments list ── */}
      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <p className="text-[11px] font-bold text-black/30 uppercase tracking-widest mb-4">
          Moments along this route
          {waypoints.length > 0 && (
            <span className="ml-1.5 font-semibold text-black/50">
              ({waypoints.length})
            </span>
          )}
        </p>

        <div className="space-y-3">
          {waypoints.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-black/10 rounded-[24px] bg-white/50">
              <MapPin className="w-6 h-6 text-black/20 mx-auto mb-2" />
              <p className="text-[13px] text-black/40 font-medium">
                No moments recorded on this route.
              </p>
            </div>
          ) : (
            waypoints.map((wp) => {
              const Icon = iconMap[wp.type] ?? MapPin;
              const label = labelMap[wp.type] ?? "Moment";
              const isActive = activeWaypointId === wp.id;

              const displayContent =
                wp.type === "image" ? "Photo Moment" : wp.content;

              return (
                <div
                  key={wp.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onWaypointSelect(wp)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onWaypointSelect(wp);
                    }
                  }}
                  className={`w-full flex items-center gap-3.5 p-4 rounded-[22px] border cursor-pointer
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20
                    transition-all active:scale-[0.99]
                    ${
                      isActive
                        ? "bg-black text-white border-black shadow-sm"
                        : "bg-white hover:border-black/10 border-black/[0.05]"
                    }`}
                >
                  {/* Icon chip */}
                  <div
                    className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0
                      ${isActive ? "bg-white/15" : "bg-black"}`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-white"}`} />
                  </div>

                  {/* Text */}
                  <div className="min-w-0 text-left flex-1">
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider leading-none mb-1
                        ${isActive ? "text-white/55" : "text-black/35"}`}
                    >
                      {wp.category || label}
                    </p>
                    <p
                      className={`text-[13px] font-semibold leading-snug truncate
                        ${isActive ? "text-white" : "text-black/85"}`}
                    >
                      {displayContent}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
