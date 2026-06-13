"use client";

import { useEffect, useRef, useState } from "react";
import { WaypointMedia } from "@/types";
import { MapPin, Volume2, Camera, FileText, CheckCircle, X, RotateCcw, Play, Pause, Square } from "lucide-react";

interface ReplayOverlayProps {
  guidanceState: "idle" | "synced" | "following" | "complete";
  distanceToStart: number | null;
  trailProgress: number;
  activeWaypoint: WaypointMedia | null;
  syncPrompt: "start" | "midpoint" | null;
  skipPercent: number;
  onStartGuidance: () => void;
  onDismissSyncPrompt: () => void;
  onDismissWaypoint: () => void;
  onBack: () => void;
  onCommentsClick: () => void;
  onRetrace: () => void;
  commentCount?: number;
  // Simulator props
  isSimulating: boolean;
  isSimPlay: boolean;
  simulationSpeed: 1 | 3 | 10;
  simulationProgress: number; // 0–100
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onToggleSimPlay: () => void;
  onChangeSimSpeed: (speed: 1 | 3 | 10) => void;
  onSeekSimulation: (percent: number) => void;
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
  syncPrompt,
  skipPercent,
  onStartGuidance,
  onDismissSyncPrompt,
  onDismissWaypoint,
  onBack,
  onCommentsClick,
  onRetrace,
  commentCount = 0,
  isSimulating,
  isSimPlay,
  simulationSpeed,
  simulationProgress,
  onStartSimulation,
  onStopSimulation,
  onToggleSimPlay,
  onChangeSimSpeed,
  onSeekSimulation,
}: ReplayOverlayProps) {
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionDismissed, setCompletionDismissed] = useState(false);
  const [showRetracePrompt, setShowRetracePrompt] = useState(false);
  const retraceShownRef = useRef(false);

  useEffect(() => {
    if (guidanceState === "complete") {
      setShowCompletion(true);
    }
  }, [guidanceState]);

  useEffect(() => {
    if (completionDismissed && distanceToStart !== null && distanceToStart < 20 && !retraceShownRef.current) {
      setShowRetracePrompt(true);
      retraceShownRef.current = true;
    }
  }, [completionDismissed, distanceToStart]);

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

  const speedOptions: (1 | 3 | 10)[] = [1, 3, 10];

  return (
    <>
      {/* Back button — top-left */}
      <button
        onClick={isSimulating ? onStopSimulation : onBack}
        className="absolute top-5 left-5 z-40 w-10 h-10 rounded-full bg-white/80 backdrop-blur-2xl border border-black/[0.05] shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-90 transition-all duration-200 hover:bg-white group"
        title={isSimulating ? "Stop simulation" : "Back to dashboard"}
      >
        {isSimulating ? (
          <Square className="w-3.5 h-3.5 text-black/60 fill-black/60" />
        ) : (
          <svg className="w-4 h-4 text-black/60 group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        )}
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

      {/* Distance badge — top-right (hide during simulation) */}
      {!isSimulating && guidanceState !== "complete" && distanceToStart !== null && (
        <div className="absolute top-5 right-5 z-40 animate-fade-in">
          <div className="px-4 py-2 rounded-full bg-white/80 backdrop-blur-2xl border border-black/[0.05] shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${guidanceState === "following" ? "bg-black" : "bg-green-500"}`} />
            <span className="text-[13px] font-semibold text-black/70 tracking-tight tabular-nums">
              {formatDistance(distanceToStart)}
            </span>
          </div>
        </div>
      )}

      {/* Progress badge — top-center when following or complete */}
      {(guidanceState === "following" || guidanceState === "complete") && !isSimulating && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <div className="px-4 py-2 rounded-full bg-black/80 backdrop-blur-2xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
            <span className="text-[12px] font-semibold text-white/80 tracking-tight tabular-nums">
              {trailProgress}%
            </span>
          </div>
        </div>
      )}

      {/* Simulation progress badge — top-center during simulation */}
      {isSimulating && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <div className="px-4 py-2 rounded-full bg-[#0052FF]/90 backdrop-blur-2xl border border-white/10 shadow-[0_4px_20px_rgba(0,82,255,0.3)] flex items-center gap-2.5">
            {isSimPlay ? (
              <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
            )}
            <span className="text-[12px] font-semibold text-white/90 tracking-tight tabular-nums">
              {simulationProgress}%
            </span>
          </div>
        </div>
      )}

      {/* ── SIMULATOR PLAYER BAR ── bottom when simulating */}
      {isSimulating && (
        <div className="absolute bottom-0 left-0 right-0 z-50 animate-slide-up-sheet">
          <div className="mx-4 mb-6 rounded-[24px] bg-white/95 backdrop-blur-2xl border border-black/[0.04] shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden">
            {/* Progress slider */}
            <div className="px-5 pt-4 pb-1">
              <div className="relative h-2 rounded-full bg-black/[0.06]">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-[#0052FF] transition-all duration-150 pointer-events-none"
                  style={{ width: `${simulationProgress}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={simulationProgress}
                  onChange={(e) => onSeekSimulation(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
            {/* Scrub label */}
            <div className="flex items-center justify-between px-5 pt-1 pb-1">
              <span className="text-[10px] font-medium text-black/30 tabular-nums">0%</span>
              <span className="text-[10px] font-medium text-black/30 tabular-nums">100%</span>
            </div>
            {/* Controls */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-black/[0.04]">
              {/* Speed selector */}
              <div className="flex items-center gap-1">
                {speedOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => onChangeSimSpeed(s)}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                      simulationSpeed === s
                        ? "bg-black text-white"
                        : "bg-black/[0.05] text-black/40 hover:bg-black/[0.09] hover:text-black/60"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>

              {/* Play / Pause */}
              <button
                onClick={onToggleSimPlay}
                className="w-12 h-12 rounded-full bg-black flex items-center justify-center active:scale-90 transition-transform shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
              >
                {isSimPlay ? (
                  <Pause className="w-5 h-5 text-white fill-white" />
                ) : (
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                )}
              </button>

              {/* Stop button */}
              <button
                onClick={onStopSimulation}
                className="h-7 px-3 rounded-lg bg-black/[0.05] text-[11px] font-semibold text-black/40 hover:bg-black/[0.09] hover:text-black/60 active:scale-95 transition-all"
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IDLE STATE — Small floating walkthrough button ── */}
      {!isSimulating && guidanceState === "idle" && syncPrompt === null && (distanceToStart === null || distanceToStart > 30) && (
        <button
          onClick={onStartSimulation}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 h-10 px-4 rounded-xl bg-white/80 backdrop-blur-2xl border border-black/[0.05] shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-2 active:scale-90 transition-all duration-200 hover:bg-white"
          title="Virtual walkthrough"
        >
          <Play className="w-4 h-4 text-[#0052FF] fill-[#0052FF]" />
          <span className="text-[13px] font-semibold text-black/70">Walkthrough</span>
        </button>
      )}

      {/* Waypoint content sheet — bottom when waypoint is active */}
      {!isSimulating && activeWaypoint && (
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

      {/* Simulating waypoint popup — small floating card (doesn't block controls) */}
      {isSimulating && activeWaypoint && (
        <div className="absolute bottom-44 left-4 right-4 z-50 animate-fade-in">
          <div className="p-4 rounded-[20px] bg-white/95 backdrop-blur-2xl border border-black/[0.04] shadow-[0_8px_30px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[12px] bg-[#0052FF] flex items-center justify-center shrink-0">
                {(() => {
                  const Icon = iconMap[activeWaypoint.type] || MapPin;
                  return <Icon className="w-3.5 h-3.5 text-white" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">
                  {labelMap[activeWaypoint.type] || "Moment"} unlocked
                </p>
                {activeWaypoint.type === "voice" ? (
                  <audio controls src={activeWaypoint.fileUrl} className="w-full h-8 mt-1" />
                ) : activeWaypoint.type === "image" && activeWaypoint.fileUrl ? (
                  <img src={activeWaypoint.fileUrl} alt="" className="w-full rounded-lg mt-1 max-h-32 object-cover" />
                ) : (
                  <p className="text-[13px] font-semibold text-black/75 leading-snug truncate">
                    {activeWaypoint.content}
                  </p>
                )}
              </div>
              <button
                onClick={onDismissWaypoint}
                className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
              >
                <X className="w-3 h-3 text-black/40" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start prompt — user arrives at trail start */}
      {syncPrompt === "start" && !isSimulating && (
        <div className="absolute bottom-0 left-0 right-0 z-50 animate-slide-up-sheet">
          <div className="mx-4 mb-6 p-5 rounded-[24px] bg-white/95 backdrop-blur-2xl border border-black/[0.04] shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#0052FF]/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-[#0052FF]" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-black tracking-tight">Trail start found</p>
                <p className="text-[13px] text-black/50 font-medium">Follow this route?</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onStartSimulation}
                className="flex-1 h-11 rounded-xl bg-black/[0.05] text-[13px] font-semibold text-black/60 active:scale-95 transition-transform"
              >
                Simulate
              </button>
              <button
                onClick={onStartGuidance}
                className="flex-1 h-11 rounded-xl bg-black text-white text-[13px] font-semibold active:scale-95 transition-transform"
              >
                Go
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Midpoint prompt — user joins the trail partway */}
      {syncPrompt === "midpoint" && !isSimulating && (
        <div className="absolute bottom-0 left-0 right-0 z-50 animate-slide-up-sheet">
          <div className="mx-4 mb-6 p-5 rounded-[24px] bg-white/95 backdrop-blur-2xl border border-black/[0.04] shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-bold text-black tracking-tight">Joining partway</p>
                <p className="text-[13px] text-black/50 font-medium">
                  You&apos;re {skipPercent}% along this trail. Start tracing from here?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={onDismissSyncPrompt}
                className="flex-1 h-11 rounded-xl bg-black/[0.05] text-[13px] font-semibold text-black/60 active:scale-95 transition-transform"
              >
                Not now
              </button>
              <button
                onClick={onStartGuidance}
                className="flex-1 h-11 rounded-xl bg-black text-white text-[13px] font-semibold active:scale-95 transition-transform"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion card — small bottom sheet with X dismiss */}
      {showCompletion && !isSimulating && (
        <div className="absolute bottom-0 left-0 right-0 z-50 animate-slide-up-sheet">
          <div className="mx-4 mb-6 p-5 rounded-[24px] bg-white/95 backdrop-blur-2xl border border-black/[0.04] shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
            <button
              onClick={() => { setShowCompletion(false); setCompletionDismissed(true); }}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-black/5 flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="w-3.5 h-3.5 text-black/40" />
            </button>
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-black tracking-tight">You made it!</p>
                <p className="text-[13px] text-black/50 font-medium">Route complete — {trailProgress}% trail followed</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Retrace prompt — shows when user nears start after completion */}
      {showRetracePrompt && !isSimulating && (
        <div className="absolute bottom-0 left-0 right-0 z-50 animate-slide-up-sheet">
          <div className="mx-4 mb-6 p-5 rounded-[24px] bg-white/95 backdrop-blur-2xl border border-black/[0.04] shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-black/60" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-black tracking-tight">Close to start — retrace?</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setShowRetracePrompt(false)}
                className="flex-1 h-10 rounded-xl bg-black/[0.05] text-[13px] font-semibold text-black/60 active:scale-95 transition-transform"
              >
                Not now
              </button>
              <button
                onClick={() => { setShowRetracePrompt(false); setCompletionDismissed(false); retraceShownRef.current = false; onRetrace(); }}
                className="flex-1 h-10 rounded-xl bg-black text-white text-[13px] font-semibold active:scale-95 transition-transform"
              >
                Yes, start over
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
