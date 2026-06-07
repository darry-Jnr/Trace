"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Trash2, Check, Settings } from "lucide-react";

interface VoiceRecorderProps {
  onAudioRecorded?: (audioBlob: Blob, durationSec: number) => void;
  onStateChange?: (state: "idle" | "recording" | "locked-recording") => void;
}

const TOOLTIP_KEY = "trace_voice_tooltip_seen";

export default function VoiceRecorder({
  onAudioRecorded,
  onStateChange,
}: VoiceRecorderProps) {
  const [internalState, setInternalState] = useState<"idle" | "recording" | "locked-recording">("idle");
  const [recTime, setRecTime] = useState(0);
  const [waves, setWaves] = useState<number[]>(Array(16).fill(2));
  const [volume, setVolume] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [micErrorIsPermission, setMicErrorIsPermission] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const micErrorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartY = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recTimeRef = useRef(0);
  const hasSavedRef = useRef(false);
  const isRecordingIntentRef = useRef(false);
  const onStateChangeRef = useRef(onStateChange);
  const onAudioRecordedRef = useRef(onAudioRecorded);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
  useEffect(() => { onAudioRecordedRef.current = onAudioRecorded; }, [onAudioRecorded]);

  // ── Onboarding tooltip ──────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(TOOLTIP_KEY)) {
      setShowTooltip(true);
      const t = setTimeout(() => {
        setShowTooltip(false);
        localStorage.setItem(TOOLTIP_KEY, "1");
      }, 4000);
      return () => clearTimeout(t);
    }
  }, []);

  // ── Reduced motion detection ────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const updateState = useCallback((newState: "idle" | "recording" | "locked-recording") => {
    setInternalState(newState);
    onStateChangeRef.current?.(newState);
  }, []);

  const cleanupAudioTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopVisualization = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = 0;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setWaves(Array(16).fill(2));
    setVolume(0);
  }, []);

  const startVisualization = useCallback((stream: MediaStream) => {
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const freqArray = new Uint8Array(analyser.frequencyBinCount);
      const timeArray = new Uint8Array(analyser.fftSize);
      const draw = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(freqArray);
        analyserRef.current.getByteTimeDomainData(timeArray);
        const samples: number[] = [];
        const step = Math.max(1, Math.floor(freqArray.length / 16));
        let peak = 0;
        for (let i = 0; i < 16; i++) {
          const idx = Math.min(i * step, freqArray.length - 1);
          const val = freqArray[idx] / 255;
          samples.push(Math.max(2, val * 36));
          if (val > peak) peak = val;
        }
        setWaves(samples);
        setVolume(peak);
        animFrameRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch (e) {
      console.error("Audio visualization init failed:", e);
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ── Haptic feedback ─────────────────────────────────
  const haptic = useCallback((ms: number) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }, []);

  // ── Error recovery (open browser settings) ──────────
  const openMicSettings = useCallback(() => {
    const urls: Record<string, string> = {
      chrome: "chrome://settings/content/microphone",
      edge: "edge://settings/content/microphone",
    };
    for (const [key, url] of Object.entries(urls)) {
      if (navigator.userAgent.toLowerCase().includes(key)) {
        window.open(url, "_blank");
        return;
      }
    }
    setMicError(null);
    setMicErrorIsPermission(false);
  }, []);

  const setError = useCallback((msg: string, isPermission: boolean) => {
    setMicError(msg);
    setMicErrorIsPermission(isPermission);
    if (!isPermission) {
      if (micErrorTimerRef.current) clearTimeout(micErrorTimerRef.current);
      micErrorTimerRef.current = setTimeout(() => setMicError(null), 3000);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecordingIntentRef.current) return;
    isRecordingIntentRef.current = true;
    hasSavedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isRecordingIntentRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      startVisualization(stream);
      haptic(30);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (hasSavedRef.current) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const duration = recTimeRef.current;
        if (audioChunksRef.current.length > 0 && duration > 0.5) {
          onAudioRecordedRef.current?.(audioBlob, duration);
        }
        cleanupMedia();
        stopVisualization();
      };

      recorder.start();
      updateState("recording");
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
      console.error("Audio recording error:", err);
      isRecordingIntentRef.current = false;
      const isPerm =
        err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      const msg = isPerm
        ? "Microphone access denied"
        : err?.name === "NotFoundError"
          ? "No microphone found"
          : "Could not access microphone";
      setError(msg, isPerm);
    }
  }, [startVisualization, cleanupMedia, stopVisualization, updateState, haptic, setError]);

  const stopAndSaveRecording = useCallback(() => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;
    isRecordingIntentRef.current = false;
    cleanupAudioTimer();
    stopVisualization();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    cleanupMedia();
    updateState("idle");
    haptic(15);
  }, [cleanupAudioTimer, stopVisualization, cleanupMedia, updateState, haptic]);

  const cancelRecording = useCallback(() => {
    hasSavedRef.current = true;
    isRecordingIntentRef.current = false;
    cleanupAudioTimer();
    stopVisualization();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanupMedia();
    updateState("idle");
    haptic(10);
  }, [cleanupAudioTimer, stopVisualization, cleanupMedia, updateState, haptic]);

  // Keep ref in sync for global pointerup
  const stopAndSaveRef = useRef(stopAndSaveRecording);
  useEffect(() => { stopAndSaveRef.current = stopAndSaveRecording; }, [stopAndSaveRecording]);

  // Global pointerup — release anywhere stops recording (when not locked)
  useEffect(() => {
    if (internalState !== "recording") return;
    const handlePointerUp = () => stopAndSaveRef.current();
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [internalState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudioTimer();
      stopVisualization();
      cleanupMedia();
      if (micErrorTimerRef.current) clearTimeout(micErrorTimerRef.current);
      isRecordingIntentRef.current = false;
    };
  }, [cleanupAudioTimer, stopVisualization, cleanupMedia]);

  // ── Swipe-down to cancel ────────────────────────────
  useEffect(() => {
    if (internalState !== "recording") return;
    const handleMove = (e: PointerEvent) => {
      if (touchStartY.current - e.clientY < -60) {
        cancelRecording();
      }
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, [internalState, cancelRecording]);

  // ── Keyboard shortcut (Space to toggle) ─────────────
  useEffect(() => {
    if (internalState !== "idle" && internalState !== "recording") return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (internalState === "idle") startRecording();
        else stopAndSaveRecording();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [internalState, startRecording, stopAndSaveRecording]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (internalState !== "idle") return;
    e.preventDefault();
    touchStartY.current = e.clientY;
    startRecording();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (internalState !== "recording") return;
    if (touchStartY.current - e.clientY > 60) {
      updateState("locked-recording");
    }
  };

  const handleClick = () => {
    if (internalState === "idle") {
      startRecording();
    } else if (internalState === "recording") {
      stopAndSaveRecording();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Wave bar color based on volume
  const waveColor = volume < 0.15 ? "bg-green-500/70" : volume < 0.4 ? "bg-yellow-500/70" : "bg-red-500/70";

  // ── IDLE ──────────────────────────────────────────
  if (internalState === "idle") {
    return (
      <div className="relative">
        <button
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          className="relative w-12 h-12 rounded-[18px] bg-white border border-black/[0.05] shadow-sm flex items-center justify-center active:scale-90 transition-all duration-200 select-none cursor-pointer hover:bg-black/[0.02] touch-none"
          title="Click or hold to record"
        >
          <Mic className="w-[19px] h-[19px] text-black/70 stroke-[2.3]" />
        </button>

        {/* Onboarding tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-3 py-2 rounded-xl bg-black text-white text-[11px] font-medium text-center shadow-lg animate-fade-in pointer-events-none">
            Hold to record · Release to send · Swipe up to lock
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45" />
          </div>
        )}

        {/* Mic error tooltip */}
        {micError && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-xl bg-red-500 text-white text-[11px] font-medium text-center shadow-lg animate-fade-in z-10 min-w-[160px]">
            <p>{micError}</p>
            {micErrorIsPermission && (
              <button
                onClick={openMicSettings}
                className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 text-white text-[10px] font-semibold hover:bg-white/30 transition"
              >
                <Settings className="w-3 h-3" />
                Open Settings
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── RECORDING / LOCKED ────────────────────────────
  const isLocked = internalState === "locked-recording";

  return (
    <div className={`flex-1 flex items-center justify-between w-full h-12 px-1 ${reducedMotion ? "" : "animate-fade-in"}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className={`w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 ${reducedMotion ? "" : "animate-pulse"}`} />

        <div className="flex items-center gap-[2px] h-8">
          {waves.map((h, i) => (
            <div
              key={i}
              className={`w-[3px] rounded-full transition-all duration-75 ${waveColor}`}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>

        {/* Volume level meter */}
        <div className="hidden sm:flex items-center w-12 h-1.5 rounded-full bg-black/10 overflow-hidden shrink-0">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${Math.max(2, volume * 100)}%`,
              backgroundColor:
                volume < 0.15 ? "#22c55e" : volume < 0.4 ? "#eab308" : "#ef4444",
            }}
          />
        </div>

        <span className="text-[14px] font-semibold text-black tracking-tight tabular-nums shrink-0">
          {formatTime(recTime)}
        </span>

        {!isLocked && (
          <span className={`text-[11px] font-medium text-black/35 hidden sm:inline shrink-0 ${reducedMotion ? "" : "animate-pulse"}`}>
            ↑ Lock
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={cancelRecording}
          className="w-9 h-9 rounded-full flex items-center justify-center text-black/40 hover:text-red-500 hover:bg-red-50 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {isLocked ? (
          <button
            onClick={stopAndSaveRecording}
            className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shadow-sm active:scale-95 transition"
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </button>
        ) : (
          <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center">
            <Mic className="w-4 h-4 text-black/40" />
          </div>
        )}
      </div>
    </div>
  );
}
