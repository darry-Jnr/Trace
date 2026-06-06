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
  // 1. New Props added for the genuine dynamic telemetry records
  points?: [number, number][]; 
  mapSnapshotUrl?: string; 
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
  mapSnapshotUrl,
}: SaveReviewModalProps) {
  
  // Helper to safely transform live coordinates into scaled SVG ViewBox coordinates (0-100)
  const getDynamicSVGPath = () => {
    if (points.length < 2) return "M 10 50 L 90 50"; // Clean baseline if empty

    const lats = points.map(p => p[0]);
    const lngs = points.map(p => p[1]);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;

    // Build standard path string mapping local coords perfectly into the viewframe bounding box
    return points
      .map((pt, index) => {
        // Scale to 10-90 to leave a beautiful padding inside the preview squircle box
        const x = 10 + ((pt[1] - minLng) / lngRange) * 80;
        const y = 90 - ((pt[0] - minLat) / latRange) * 80; // Invert Y since SVG 0 is top
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const svgPath = getDynamicSVGPath();

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
        <p className="text-[13px] font-medium tracking-tight text-black/40">Review Trace</p>
        <div className="w-10" />
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-5 pt-6 pb-10">

          {/* Preview Card Chassis */}
          <div className="relative overflow-hidden rounded-[32px] border border-black/[0.06] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.06)]">

            {/* Top Visual Box */}
            <div className="relative aspect-[4/3] bg-[#edf0f2] overflow-hidden">
              
              {/* 2. Real Map Backdrop Image Layer */}
              {mapSnapshotUrl ? (
                <img 
                  src={mapSnapshotUrl} 
                  alt="Trace Path Route Snapshot" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                /* Grid System Fallback if map image API isn't supplied yet */
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-[0.03] bg-neutral-100">
                  {Array.from({ length: 64 }).map((_, i) => (
                    <div key={i} className="border border-black" />
                  ))}
                </div>
              )}

              {/* 3. High-Contrast Overlay Render of the Actual Walked Coordinates */}
              <svg
                className="absolute inset-0 w-full h-full z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path
                  d={svgPath}
                  fill="none"
                  stroke="black"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Floating Status Tag */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-black/[0.06] shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-black/60" />
                <span className="text-[11px] font-medium tracking-tight text-black/60">
                  Ready to save
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
                <input
                  type="text"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="Home Route"
                  className="w-full h-14 px-5 rounded-2xl bg-[#f5f5f7] border border-transparent focus:border-black/10 focus:bg-white outline-none transition text-[15px] font-medium tracking-tight placeholder:text-black/25"
                />
              </div>

              {/* Meta Blocks */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-2xl bg-[#f5f5f7] p-4">
                  <div className="flex items-center gap-2 text-black/35 mb-2">
                    <Clock3 className="w-4 h-4" />
                    <span className="text-[11px] font-medium uppercase tracking-wide">Created</span>
                  </div>
                  <p className="text-[14px] font-medium tracking-tight">Just now</p>
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
            onClick={onSave}
            className="mt-5 w-full h-14 rounded-[20px] bg-black text-white flex items-center justify-center gap-2 text-[15px] font-medium tracking-tight shadow-lg hover:scale-[1.01] active:scale-[0.985] transition-all"
          >
            <span>Save Trace</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>

          <p className="text-center text-[12px] text-black/35 mt-4 leading-relaxed">
            Your route, notes, photos, and voice markers will be saved together.
          </p>
        </div>
      </div>
    </div>
  );
}