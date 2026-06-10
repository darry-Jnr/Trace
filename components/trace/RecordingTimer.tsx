"use client";

import { useState, useEffect } from "react";

function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function RecordingTimer({ isRecording }: { isRecording: boolean }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isRecording) {
      setElapsedMs(0);
      return;
    }
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 200);
    return () => clearInterval(interval);
  }, [isRecording]);

  if (!isRecording) return null;

  return (
    <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
      <div className="px-4 py-2 rounded-full bg-black/90 backdrop-blur-2xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex items-center gap-2.5">
        <span className="relative flex w-2 h-2">
          <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500" />
        </span>
        <span className="text-[12px] font-semibold text-white/90 tracking-tight tabular-nums">
          {formatElapsed(elapsedMs)}
        </span>
      </div>
    </div>
  );
}
