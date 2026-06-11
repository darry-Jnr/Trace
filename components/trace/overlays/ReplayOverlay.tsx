"use client";

import { useEffect, useState } from "react";
import { WaypointMedia } from "@/types";
import { MapPin, Volume2, Camera, FileText, CheckCircle } from "lucide-react";

interface ReplayOverlayProps {
  guidanceState: "idle" | "synced" | "following" | "complete";
  distanceToStart: number | null;
  trailProgress: number;
  activeWaypoint: WaypointMedia | null;
  onStartGuidance: () => void;
  onDismissWaypoint: () => void;
  onBack: () => void;
  onCommentsClick: () => void;
  commentCount?: number;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export default function ReplayOverlay({
  guidanceState,
  distanceToStart,
  trailProgress,
  activeWaypoint,
  onStartGuidance,
  onDismissWaypoint,
  onBack,
  onCommentsClick,
  commentCount = 0,
}: ReplayOverlayProps) {
  const [showSyncAnimation, setShowSyncAnimation] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    if (guidanceState === "synced") {
      setShowSyncAnimation(true);
      const timer = setTimeout(() => setShowSyncAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [guidanceState]);

  useEffect(() => {
    if (guidanceState === "complete") {
      setShowCompletion(true);
    }
  }, [guidanceState]);

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
    <>
      {/* Back button — top-left */}
      <button
        onClick={onBack}
        className="absolute top-5 left-5 z-40 w-10 h-10 rounded-full bg-white/80 backdrop-blur-2xl border border-black/[0.05] shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-90 transition-all duration-200 hover:bg-white group"
        title="Back to dashboard"
      >
        <svg className="w-4 h-4 text-black/60 group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Comments button — middle-right (YouTube style) */}
      <div className="absolute top-1/2 right-5 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5">
        <button
          onClick={onCommentsClick}
          className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-2xl border border-black/[0.05] shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-90 transition-all duration-200 hover:bg-white group"
          title="Comments"
        >
          <svg className="w-5 h-5 text-black/60 group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        {commentCount > 0 && (
          <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            {commentCount}
          </span>
        )}
      </div>

      {/* Distance badge — top-right */}
      {guidanceState !== "complete" && distanceToStart !== null && (
        <div className="absolute top-5 right-5 z-40 animate-fade-in">
          <div className="px-4 py-2 rounded-full bg-white/80 backdrop-blur-2xl border border-black/[0.05] shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${guidanceState === "following" ? "bg-black" : "bg-green-500"}`} />
            <span className="text-[13px] font-semibold text-black/70 tracking-tight tabular-nums">
              {formatDistance(distanceToStart)}
            </span>
          </div>
        </div>
      )}

      {/* Progress badge — top-center when following */}
      {guidanceState === "following" && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <div className="px-4 py-2 rounded-full bg-black/80 backdrop-blur-2xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
            <span className="text-[12px] font-semibold text-white/80 tracking-tight tabular-nums">
              {trailProgress}%
            </span>
          </div>
        </div>
      )}

      {/* Sync animation — center screen */}
      {showSyncAnimation && guidanceState === "synced" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-green-500/20 animate-ping absolute" />
              <div className="w-16 h-16 rounded-full bg-black border-4 border-white shadow-lg flex items-center justify-center relative">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
            <p className="text-white text-sm font-semibold bg-black/60 px-4 py-2 rounded-full backdrop-blur-md">
              Location synced
            </p>
          </div>
        </div>
      )}

      {/* Start guidance button — center-bottom when synced */}
      {guidanceState === "synced" && !showSyncAnimation && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up">
          <button
            onClick={onStartGuidance}
            className="h-14 px-8 rounded-full bg-black text-white text-[15px] font-semibold tracking-tight shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex items-center gap-2.5 hover:scale-[1.02] active:scale-[0.97] transition-all"
          >
            <MapPin className="w-4 h-4" />
            Start following route
          </button>
        </div>
      )}

      {/* Waypoint content sheet — bottom when waypoint is active */}
      {activeWaypoint && (
        <div className="absolute bottom-0 left-0 right-0 z-50 animate-slide-up-sheet">
          <div className="mx-4 mb-6 p-5 rounded-[24px] bg-white/95 backdrop-blur-2xl border border-black/[0.04] shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-[14px] bg-black flex items-center justify-center shrink-0">
                {(() => {
                  const Icon = iconMap[activeWaypoint.type] || MapPin;
                  return <Icon className="w-4 h-4 text-white" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">
                  {labelMap[activeWaypoint.type] || "Moment"}
                </p>
                {activeWaypoint.type === "image" && activeWaypoint.fileUrl ? (
                  <img src={activeWaypoint.fileUrl} alt="" className="w-full rounded-xl mt-1" />
                ) : activeWaypoint.type === "voice" ? (
                  <div className="mt-1">
                    <audio controls src={activeWaypoint.fileUrl} className="w-full h-9" />
                  </div>
                ) : (
                  <p className="text-[14px] font-semibold text-black/85 leading-snug">
                    {activeWaypoint.content}
                  </p>
                )}
              </div>
              <button
                onClick={onDismissWaypoint}
                className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
              >
                <svg className="w-3.5 h-3.5 text-black/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion modal */}
      {showCompletion && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in">
          <div className="mx-4 p-8 rounded-[32px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col items-center max-w-[320px]">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-5">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-[22px] font-bold tracking-tight text-black text-center">
              You made it!
            </h2>
            <p className="mt-2 text-[14px] text-black/50 font-medium text-center leading-relaxed">
              You've successfully followed the entire route.
            </p>
            <button
              onClick={onBack}
              className="mt-6 w-full h-12 rounded-full bg-black text-white text-[14px] font-semibold tracking-tight active:scale-[0.98] transition-transform"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
