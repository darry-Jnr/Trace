"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Trash2, Lock, Unlock, Check } from "lucide-react";

interface VoiceRecorderProps {
  onAudioRecorded?: (audioBlob: Blob, durationSec: number) => void;
  isActive: boolean;
  onStateChange: (state: "idle" | "recording" | "locked-recording") => void;
}

export default function VoiceRecorder({
  onAudioRecorded,
  isActive,
  onStateChange,
}: VoiceRecorderProps) {
  const [recTime, setRecTime] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const touchStartY = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- AUDIO PIPELINE ENGINE ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioChunksRef.current.length > 0 && recTime > 0) {
          onAudioRecorded?.(audioBlob, recTime);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      onStateChange("recording");
      setRecTime(0);
      timerRef.current = setInterval(() => {
        setRecTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Audio recording system initialization error:", err);
    }
  };

  const stopAndSaveRecording = () => {
    cleanupAudioTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    onStateChange("idle");
    setIsLocked(false);
  };

  const cancelRecording = () => {
    cleanupAudioTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null; // Discard chunks cleanly
      mediaRecorderRef.current.stop();
    }
    onStateChange("idle");
    setIsLocked(false);
  };

  const cleanupAudioTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    return () => {
      cleanupAudioTimer();
    };
  }, []);

  // --- GESTURE CAPTURE MECHANISMS ---
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    startRecording();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isActive) return;
    const currentY = e.touches[0].clientY;
    const distanceSwipedUp = touchStartY.current - currentY;

    if (distanceSwipedUp > 60) {
      onStateChange("locked-recording");
      setIsLocked(true);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!isActive) {
    return (
      <button
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onMouseDown={startRecording}
        onMouseUp={stopAndSaveRecording}
        className="group w-12 h-12 rounded-[18px] bg-white border border-black/[0.05] shadow-sm flex flex-col items-center justify-center active:scale-90 transition-all duration-200 select-none cursor-pointer hover:bg-black/[0.02]"
        title="Hold to Record, swipe up to lock"
      >
        <Mic className="w-[19px] h-[19px] text-black/70 stroke-[2.3]" />
      </button>
    );
  }

  // Active / recording UI
  return (
    <div className="flex-1 flex items-center justify-between w-full h-12 px-2 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[14px] font-semibold text-black tracking-tight tabular-nums">
          {formatTime(recTime)}
        </span>
        {!isLocked && (
          <span className="text-[12px] font-medium text-black/35 animate-pulse flex items-center gap-1">
            <Lock className="w-3 h-3" /> Drag up to lock
          </span>
        )}
        {isLocked && (
          <span className="text-[12px] font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            <Unlock className="w-3 h-3" /> Channel Locked
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={cancelRecording}
          className="w-10 h-10 rounded-full flex items-center justify-center text-black/40 hover:text-red-500 hover:bg-red-50 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {isLocked ? (
          <button
            onClick={stopAndSaveRecording}
            className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-sm transition active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </button>
        ) : (
          <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black/40 animate-pulse">
            <Mic className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
