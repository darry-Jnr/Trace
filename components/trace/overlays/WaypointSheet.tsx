"use client";

import { useState, useRef } from "react";
import { X, Camera, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { WaypointMedia } from "@/types";

const WAVE_BARS = [3, 8, 4, 12, 6, 15, 8, 18, 10, 20, 12, 22, 10, 18, 8, 14, 6, 16, 10, 20, 14, 24, 12, 22, 10, 18, 8, 16, 6, 14, 8, 18, 12, 22, 14, 24, 10, 18, 6, 12];

interface WaypointSheetProps {
  activeWaypoint: WaypointMedia | null;
  groupItems: WaypointMedia[];
  groupIndex: number;
  itemCount: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export default function WaypointSheet({ activeWaypoint, groupItems, groupIndex, itemCount, onPrev, onNext, onClose }: WaypointSheetProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!activeWaypoint) return null;

  const imageSrc = activeWaypoint.fileUrl || (
    activeWaypoint.content.startsWith("data:image/") ? activeWaypoint.content : null
  );

  const audioSrc = activeWaypoint.fileUrl || null;

  const progress = duration > 0 ? currentTime / duration : 0;
  const hasPrev = groupIndex > 0;
  const hasNext = groupIndex < itemCount - 1;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const handleWaveClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    audioRef.current.currentTime = (x / rect.width) * duration;
    setCurrentTime((x / rect.width) * duration);
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.5, 2];
    const idx = speeds.indexOf(speed);
    const next = speeds[(idx + 1) % speeds.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-50 flex justify-center p-4 md:pb-6 pointer-events-none">
      <div className="bg-white/95 backdrop-blur-xl w-full md:max-w-md rounded-[28px] border border-black/[0.04] shadow-[0_-10px_40px_rgba(0,0,0,0.06),0_20px_50px_rgba(0,0,0,0.1)] p-6 relative pointer-events-auto animate-slide-up-sheet overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 text-black/30 hover:text-black w-6 h-6 flex items-center justify-center rounded-full bg-black/[0.03] transition-colors">
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        <div className="flex items-center justify-between mb-2.5 pr-8">
          <span className="text-[10px] font-bold tracking-wider text-black/40 uppercase">
            {activeWaypoint.category}
          </span>
          {itemCount > 1 && (
            <span className="text-[10px] font-semibold text-black/30">
              {groupIndex + 1} / {itemCount}
            </span>
          )}
        </div>

        {activeWaypoint.type === "text" && (
          <p className="text-sm font-medium text-black/80 tracking-tight leading-relaxed">{activeWaypoint.content}</p>
        )}

        {activeWaypoint.type === "image" && (
          <div className="space-y-3.5">
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt="Captured Snapshot"
                className="w-full aspect-[16/10] object-cover rounded-[20px] border border-black/[0.05]"
              />
            ) : (
              <div className="w-full aspect-[16/10] bg-black/[0.03] border border-black/[0.05] rounded-[20px] flex flex-col items-center justify-center text-black/20">
                <Camera className="w-8 h-8 stroke-[1.5] mb-1" />
                <span className="text-[10px] font-semibold tracking-tight text-black/35">Asset Snapshot Layer</span>
              </div>
            )}
          </div>
        )}

        {activeWaypoint.type === "voice" && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-black/80 italic tracking-tight leading-relaxed">{activeWaypoint.content}</p>
            {audioSrc ? (
              audioError ? (
                <div className="flex items-center gap-3 bg-black/[0.02] border border-black/[0.04] rounded-[18px] p-3">
                  <div className="w-9 h-9 rounded-full bg-red-50 text-red-400 flex items-center justify-center shrink-0">
                    <X className="w-4 h-4" />
                  </div>
                  <span className="text-[13px] font-medium text-red-400/70 tracking-tight">Audio unavailable</span>
                </div>
              ) : (
                <>
                  <audio
                    ref={audioRef}
                    src={audioSrc}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    onError={() => setAudioError(true)}
                    preload="metadata"
                  />
                  <div className="flex items-center gap-3 bg-black/[0.02] border border-black/[0.04] rounded-[18px] p-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                      className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform shrink-0"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                    </button>
                    <div className="flex items-center gap-[2px] flex-1 h-10 cursor-pointer" onClick={handleWaveClick}>
                      {WAVE_BARS.map((val, i) => {
                        const barPos = i / WAVE_BARS.length;
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-full transition-colors duration-75"
                            style={{
                              height: `${val * 1.8}%`,
                              backgroundColor: barPos <= progress ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.15)",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-medium text-black/40 tabular-nums">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    <button
                      onClick={cycleSpeed}
                      className="px-2.5 py-1 rounded-lg border border-black/[0.06] text-[11px] font-semibold text-black/50 hover:text-black hover:bg-black/[0.02] transition active:scale-95"
                    >
                      {speed}x
                    </button>
                  </div>
                </>
              )
            ) : (
              <div className="flex items-center gap-3 bg-black/[0.02] border border-black/[0.04] rounded-[18px] p-3">
                <button className="w-9 h-9 rounded-full bg-black/20 text-black/40 flex items-center justify-center shrink-0">
                  <Play className="w-4 h-4 ml-0.5" />
                </button>
                <div className="flex items-center gap-[2px] flex-1 h-10 opacity-25">
                  {WAVE_BARS.map((val, i) => (
                    <div key={i} className="flex-1 bg-black rounded-full" style={{ height: `${val * 1.8}%` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Carousel arrows */}
        {itemCount > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="w-9 h-9 rounded-full bg-black/[0.03] border border-black/[0.04] flex items-center justify-center active:scale-90 transition disabled:opacity-20 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-[18px] h-[18px] text-black/50 stroke-[2]" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {groupItems.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-200 ${
                    i === groupIndex ? "w-5 h-1.5 bg-black/60" : "w-1.5 h-1.5 bg-black/15"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={onNext}
              disabled={!hasNext}
              className="w-9 h-9 rounded-full bg-black/[0.03] border border-black/[0.04] flex items-center justify-center active:scale-90 transition disabled:opacity-20 disabled:pointer-events-none"
            >
              <ChevronRight className="w-[18px] h-[18px] text-black/50 stroke-[2]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
