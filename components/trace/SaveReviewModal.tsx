"use client";

import React from "react";
import {
  X,
  Route,
  Sparkles,
  MapPinned,
  Clock3,
  ArrowUpRight,
} from "lucide-react";

interface SaveReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onTitleChange: (val: string) => void;
  waypointCount: number;
  distance: string;
  onSave: () => void;
  points?: [number, number][]; 
  isReadOnly?: boolean;
}

export default function SaveReviewModal({
  isOpen,
  onClose,
  title,
  onTitleChange,
  waypointCount,
  distance,
  onSave,
  points = [],
  isReadOnly = false,
}: SaveReviewModalProps) {
  
  // --- PRODUCTION REAL-LIFE METADATA MAP PARSER ---
  const generateProductionMapSnapshot = (): string => {
    if (!points || points.length < 2) return "";

    try {
      // 1. Mapbox expects longitude,latitude pairs separated by commas
      // We flip index order safely here to pass standard GPS structures [lat, lng]
      const coordinateString = points
        .map((p) => `${p[1]},${p[0]}`)
        .join(",");
      
      // 2. Configure line paint properties: path-strokeWidth+strokeColor-opacity(points)
      const pathConfiguration = `path-4+4f46e5-1(${coordinateString})`; // Clean premium Indigo path line

      const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

      // 3. "auto" tells Mapbox to center and scale perfectly around your line points bounding box
      return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${pathConfiguration}/auto/400x300?access_token=${token}`;
    } catch (err) {
      console.error("Failed compiling static preview link string:", err);
      return "";
    }
  };

  const mapSnapshotUrl = generateProductionMapSnapshot();

  return (
    <div
      className={`
        fixed inset-y-0 right-0 z-[100] bg-[#f5f5f7] flex flex-col select-none
        transition-all duration-300 ease-in-out overflow-hidden
        md:relative md:inset-auto md:z-10 md:border-l md:border-black/[0.04]
        ${isOpen 
          ? "w-full translate-x-0 opacity-100 md:w-[420px]" 
          : "w-full translate-x-full opacity-0 md:translate-x-0 md:opacity-0 md:w-0 pointer-events-none"
        }
      `}
    >
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-black/[0.03] blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 h-16 px-5 flex items-center justify-between">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white border border-black/[0.06] flex items-center justify-center shadow-sm active:scale-95 transition"
        >
          <X className="w-4 h-4 text-black/70" />
        </button>
        <p className="text-[13px] font-medium tracking-tight text-black/40">
          {isReadOnly ? "View Trace" : "Review Trace"}
        </p>
        <div className="w-10" />
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-5 pt-6 pb-10">

          {/* Preview Card Chassis */}
          <div className="relative overflow-hidden rounded-[32px] border border-black/[0.06] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.06)]">

            {/* Top Visual Box */}
            <div className="relative aspect-[4/3] bg-[#edf0f2] overflow-hidden">
              
              {/* REAL MAP IMAGE CONTAINER */}
              {mapSnapshotUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                  src={mapSnapshotUrl} 
                  alt="Trace Path Route Snapshot" 
                  className="absolute inset-0 w-full h-full object-cover animate-fade-in"
                  loading="lazy"
                />
              ) : (
                /* Sleek default skeleton fallback if coordinate stream isn't active yet */
                <div className="absolute inset-0 bg-[#eef1f4] flex items-center justify-center">
                  <p className="text-[11px] font-medium tracking-tight text-black/30">
                    Awaiting coordinate telemetry path...
                  </p>
                </div>
              )}

              {/* Floating Status Tag */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-black/[0.06] shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-black/60" />
                <span className="text-[11px] font-medium tracking-tight text-black/60">
                  {isReadOnly ? "Saved Trace" : "Ready to save"}
                </span>
              </div>

              {/* Bottom Telemetry Badges */}
              <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 h-9 rounded-full bg-white border border-black/[0.06] shadow-sm">
                  <MapPinned className="w-4 h-4 text-black/50" />
                  <span className="text-[12px] font-medium text-black/70">
                    {waypointCount} points
                  </span>
                </div>

                <div className="flex items-center gap-2 px-3 h-9 rounded-full bg-black text-white shadow-sm">
                  <Route className="w-4 h-4" />
                  <span className="text-[12px] font-medium">
                    {distance}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="p-5">
              <div>
                <p className="text-[12px] font-medium text-black/40 mb-2">Trace Name</p>
                {isReadOnly ? (
                  <div className="w-full h-14 px-5 rounded-2xl bg-[#f5f5f7] flex items-center text-[15px] font-semibold tracking-tight text-black">
                    {title}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Home Route"
                    className="w-full h-14 px-5 rounded-2xl bg-[#f5f5f7] border border-transparent focus:border-black/10 focus:bg-white outline-none transition text-[15px] font-medium tracking-tight placeholder:text-black/25"
                  />
                )}
              </div>

              {/* Meta Blocks */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-2xl bg-[#f5f5f7] p-4">
                  <div className="flex items-center gap-2 text-black/35 mb-2">
                    <Clock3 className="w-4 h-4" />
                    <span className="text-[11px] font-medium uppercase tracking-wide">Created</span>
                  </div>
                  <p className="text-[14px] font-medium tracking-tight">
                    {isReadOnly ? "Archived" : "Just now"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f5f5f7] p-4">
                  <div className="flex items-center gap-2 text-black/35 mb-2">
                    <Route className="w-4 h-4" />
                    <span className="text-[11px] font-medium uppercase tracking-wide">Distance</span>
                  </div>
                  <p className="text-[14px] font-medium tracking-tight">{distance}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Action Trigger Button */}
          <button
            onClick={isReadOnly ? onClose : onSave}
            className="mt-5 w-full h-14 rounded-[20px] bg-black text-white flex items-center justify-center gap-2 text-[15px] font-medium tracking-tight shadow-lg hover:scale-[1.01] active:scale-[0.985] transition-all"
          >
            <span>{isReadOnly ? "Close View" : "Save Trace"}</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>

          {!isReadOnly && (
            <p className="text-center text-[12px] text-black/35 mt-4 leading-relaxed">
              Your route, notes, photos, and voice markers will be saved together.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}