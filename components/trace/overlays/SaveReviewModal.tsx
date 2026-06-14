"use client";

import React from "react";
import {
  X,
  Route,
  Sparkles,
  MapPinned,
  Clock3,
  ArrowUpRight,
  LoaderCircle,
  Check,
} from "lucide-react";
import { douglasPeucker } from "@/hooks/trace/douglasPeucker";

interface SaveReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onTitleChange: (val: string) => void;
  waypointCount: number;
  distance: string;
  onSave: () => void;
  points?: [number, number][];
  isSaving?: boolean;
  savePhase?: "idle" | "saving" | "success";
  createdAt?: string;
}

function generateProductionMapSnapshot(points: [number, number][]): string {
  if (!points || points.length < 2) return "";

  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) return "";

    const simplified = points.length > 50 ? douglasPeucker(points, 10) : points;

    const coordinateString = simplified
      .map((p) => `${p[0]},${p[1]}`)
      .join(",");

    const pathConfiguration = `path-4+4f46e5-1(${coordinateString})`;

    return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${pathConfiguration}/auto/400x300?access_token=${token}`;
  } catch (err) {
    console.error("Failed compiling static preview link string:", err);
    return "";
  }
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
  isSaving = false,
  savePhase = "idle",
  createdAt = "",
}: SaveReviewModalProps) {
  const mapSnapshotUrl = generateProductionMapSnapshot(points);

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
      {savePhase === "success" ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center mb-5">
            <Check className="w-8 h-8 text-white" />
          </div>
          <p className="text-xl font-bold tracking-tight text-black mb-1">Saved!</p>
          <p className="text-sm font-medium text-black/40 text-center leading-relaxed">
            Your trace has been safely archived.
          </p>
        </div>
      ) : (
        <>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-black/[0.03] blur-3xl" />
          </div>

          <header className="relative z-10 h-16 px-5 flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={savePhase === "saving"}
              className="w-10 h-10 rounded-full bg-white border border-black/[0.06] flex items-center justify-center shadow-sm active:scale-95 transition disabled:opacity-0 disabled:pointer-events-none"
            >
              <X className="w-4 h-4 text-black/70" />
            </button>
            <p className="text-[13px] font-medium tracking-tight text-black/40">
              Review Trace
            </p>
            <div className="w-10" />
          </header>

          <div className="relative z-10 flex-1 overflow-y-auto">
            <div className="max-w-md mx-auto px-5 pt-6 pb-10">
              <div className="relative overflow-hidden rounded-[32px] border border-black/[0.06] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
                <div className="relative aspect-[4/3] bg-[#edf0f2] overflow-hidden">
                  {mapSnapshotUrl ? (
                    <img
                      key={mapSnapshotUrl}
                      src={mapSnapshotUrl}
                      alt="Trace Path Route Snapshot"
                      className="absolute inset-0 w-full h-full object-cover animate-fade-in"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[#eef1f4] flex items-center justify-center">
                      <p className="text-[11px] font-medium tracking-tight text-black/30">
                        Awaiting coordinate telemetry path...
                      </p>
                    </div>
                  )}

                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-black/[0.06] shadow-sm">
                    {savePhase === "saving" ? (
                      <LoaderCircle className="w-3.5 h-3.5 text-black/60 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-black/60" />
                    )}
                    <span className="text-[11px] font-medium tracking-tight text-black/60">
                      {savePhase === "saving" ? "Saving..." : "Ready to save"}
                    </span>
                  </div>

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

                <div className="p-5">
                  <div>
                    <p className="text-[12px] font-medium text-black/40 mb-2">Trace Name</p>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => onTitleChange(e.target.value)}
                      placeholder="Home Route"
                      disabled={savePhase === "saving"}
                      className="w-full h-14 px-5 rounded-2xl bg-[#f5f5f7] border border-transparent focus:border-black/10 focus:bg-white outline-none transition text-[15px] font-medium tracking-tight placeholder:text-black/25 disabled:opacity-40"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="rounded-2xl bg-[#f5f5f7] p-4">
                      <div className="flex items-center gap-2 text-black/35 mb-2">
                        <Clock3 className="w-4 h-4" />
                        <span className="text-[11px] font-medium uppercase tracking-wide">Created</span>
                      </div>
                      <p className="text-[14px] font-medium tracking-tight">
                        {createdAt || "Just now"}
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

              {savePhase === "saving" ? (
                <div className="mt-5 w-full h-14 rounded-[20px] bg-black text-white flex items-center justify-center gap-3 text-[15px] font-medium tracking-tight opacity-50">
                  <LoaderCircle className="w-5 h-5 animate-spin" />
                  <span>Saving your trace...</span>
                </div>
              ) : (
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="mt-5 w-full h-14 rounded-[20px] bg-black text-white flex items-center justify-center gap-2 text-[15px] font-medium tracking-tight shadow-lg hover:scale-[1.01] active:scale-[0.985] transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSaving ? (
                    <LoaderCircle className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Save Trace</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              <p className="text-center text-[12px] text-black/35 mt-4 leading-relaxed">
                Your route, notes, photos, and voice markers will be saved together.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
