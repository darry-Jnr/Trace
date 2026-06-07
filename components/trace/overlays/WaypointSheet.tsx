"use client";

import { useState, useRef } from "react";
import { X, Camera, Play, Pause } from "lucide-react";
import { WaypointMedia } from "@/types";

interface WaypointSheetProps {
  activeWaypoint: WaypointMedia | null;
  onClose: () => void;
}

export default function WaypointSheet({ activeWaypoint, onClose }: WaypointSheetProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!activeWaypoint) return null;

  const imageSrc = activeWaypoint.fileUrl || (
    activeWaypoint.content.startsWith("data:image/") ? activeWaypoint.content : null
  );

  const audioSrc = activeWaypoint.fileUrl || null;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-50 flex justify-center p-4 md:pb-6 pointer-events-none">
      <div className="bg-white/95 backdrop-blur-xl w-full md:max-w-md rounded-[28px] border border-black/[0.04] shadow-[0_-10px_40px_rgba(0,0,0,0.06),0_20px_50px_rgba(0,0,0,0.1)] p-6 relative pointer-events-auto animate-slide-up-sheet overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 text-black/30 hover:text-black w-6 h-6 flex items-center justify-center rounded-full bg-black/[0.03] transition-colors">
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        <span className="text-[10px] font-bold tracking-wider text-black/40 uppercase block mb-2.5">
          {activeWaypoint.category}
        </span>

        {activeWaypoint.type === "text" && (
          <div className="bg-black/[0.01] border border-black/[0.04] rounded-[16px] p-4">
            <p className="text-sm font-medium text-black/80 tracking-tight leading-relaxed">{activeWaypoint.content}</p>
          </div>
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
            <div className="flex items-center gap-3 bg-black/[0.02] border border-black/[0.04] rounded-[18px] p-3">
              {audioSrc ? (
                audioError ? (
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-9 h-9 rounded-full bg-red-50 text-red-400 flex items-center justify-center shrink-0">
                      <X className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-medium text-red-400/70 tracking-tight">
                      Audio unavailable
                    </span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={togglePlay}
                      className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform shrink-0"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                    </button>
                    <audio
                      ref={audioRef}
                      src={audioSrc}
                      onEnded={() => setIsPlaying(false)}
                      onError={() => setAudioError(true)}
                      preload="auto"
                    />
                    <div className="flex items-center gap-[3px] h-6 flex-1 opacity-25">
                      {[2, 4, 3, 6, 2, 5, 4, 7, 3, 5, 2, 6, 4, 3, 5, 2, 4, 3, 5, 2, 4].map((val, i) => (
                        <div key={i} className="bg-black rounded-full flex-1" style={{ height: `${val * 12}%` }} />
                      ))}
                    </div>
                  </>
                )
              ) : (
                <>
                  <button className="w-9 h-9 rounded-full bg-black/20 text-black/40 flex items-center justify-center shrink-0">
                    <Play className="w-4 h-4 ml-0.5" />
                  </button>
                  <div className="flex items-center gap-[3px] h-6 flex-1 opacity-25">
                    {[2, 4, 3, 6, 2, 5, 4, 7, 3, 5, 2, 6, 4, 3, 5, 2, 4, 3, 5, 2, 4].map((val, i) => (
                      <div key={i} className="bg-black rounded-full flex-1" style={{ height: `${val * 12}%` }} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
