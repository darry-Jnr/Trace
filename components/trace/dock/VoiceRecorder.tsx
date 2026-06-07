"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
  const [micError, setMicError] = useState<string | null>(null);
  const micErrorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartY = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recTimeRef = useRef(0);
  const isRecordingIntentRef = useRef(false);
  const hasSavedRef = useRef(false);
  const onStateChangeRef = useRef(onStateChange);
  const onAudioRecordedRef = useRef(onAudioRecorded);

  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
  useEffect(() => { onAudioRecordedRef.current = onAudioRecorded; }, [onAudioRecorded]);

  const cleanupAudioTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // --- AUDIO PIPELINE ENGINE ---
  const startRecording = useCallback(async () => {
    if (isRecordingIntentRef.current) return;
    isRecordingIntentRef.current = true;
    hasSavedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isRecordingIntentRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        if (hasSavedRef.current) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const duration = recTimeRef.current;
        if (audioChunksRef.current.length > 0 && duration > 0.5) {
          onAudioRecordedRef.current?.(audioBlob, duration);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      onStateChangeRef.current("recording");
      setRecTime(0);
      recTimeRef.current = 0;
      timerRef.current = setInterval(() => {
        setRecTime((prev) => {
          const next = prev + 1;
          recTimeRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Audio recording system initialization error:", err);
      isRecordingIntentRef.current = false;
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setMicError("Microphone access denied");
      } else if (err?.name === "NotFoundError") {
        setMicError("No microphone found");
      } else {
        setMicError("Could not access microphone");
      }
      if (micErrorTimerRef.current) clearTimeout(micErrorTimerRef.current);
      micErrorTimerRef.current = setTimeout(() => setMicError(null), 3000);
    }
  }, []);

  const stopAndSaveRecording = useCallback(() => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;
    isRecordingIntentRef.current = false;
    cleanupAudioTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    onStateChangeRef.current("idle");
    setIsLocked(false);
  }, [cleanupAudioTimer]);

  const cancelRecording = useCallback(() => {
    hasSavedRef.current = true;
    isRecordingIntentRef.current = false;
    cleanupAudioTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    onStateChangeRef.current("idle");
    setIsLocked(false);
  }, [cleanupAudioTimer]);

  const stopAndSaveRef = useRef(stopAndSaveRecording);
  useEffect(() => { stopAndSaveRef.current = stopAndSaveRecording; }, [stopAndSaveRecording]);

  // Global pointerup handler to catch releases outside the button
  useEffect(() => {
    if (!isActive) return;
    const handlePointerUp = () => {
      if (!isLocked) {
        stopAndSaveRef.current();
      }
    };
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [isActive, isLocked]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudioTimer();
      if (micErrorTimerRef.current) clearTimeout(micErrorTimerRef.current);
      isRecordingIntentRef.current = false;
    };
  }, [cleanupAudioTimer]);

  // --- GESTURE CAPTURE MECHANISMS ---
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    touchStartY.current = e.clientY;
    startRecording();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isActive) return;
    const distanceSwipedUp = touchStartY.current - e.clientY;
    if (distanceSwipedUp > 60) {
      onStateChangeRef.current("locked-recording");
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
      <div className="relative">
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          className="group w-12 h-12 rounded-[18px] bg-white border border-black/[0.05] shadow-sm flex flex-col items-center justify-center active:scale-90 transition-all duration-200 select-none cursor-pointer hover:bg-black/[0.02] touch-none"
          title="Hold to Record, swipe up to lock"
        >
          <Mic className="w-[19px] h-[19px] text-black/70 stroke-[2.3]" />
        </button>
        {micError && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-medium whitespace-nowrap shadow-lg animate-fade-in">
            {micError}
          </div>
        )}
      </div>
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
