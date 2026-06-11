"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square } from "lucide-react";

interface VoiceRecorderProps {
  onAudioRecorded?: (audioBlob: Blob, durationSec: number) => void;
  onStateChange?: (state: "idle" | "recording") => void;
}

export default function VoiceRecorder({
  onAudioRecorded,
  onStateChange,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [waves, setWaves] = useState<number[]>(Array(16).fill(2));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recTimeRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const onStateChangeRef = useRef(onStateChange);
  const onAudioRecordedRef = useRef(onAudioRecorded);

  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
  useEffect(() => { onAudioRecordedRef.current = onAudioRecorded; }, [onAudioRecorded]);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = 0;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setWaves(Array(16).fill(2));
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const freqArray = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(freqArray);
        const samples: number[] = [];
        const step = Math.max(1, Math.floor(freqArray.length / 16));
        for (let i = 0; i < 16; i++) {
          const idx = Math.min(i * step, freqArray.length - 1);
          samples.push(Math.max(2, (freqArray[idx] / 255) * 36));
        }
        setWaves(samples);
        animFrameRef.current = requestAnimationFrame(draw);
      };
      draw();

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start();
      setIsRecording(true);
      onStateChangeRef.current?.("recording");
      setRecTime(0);
      recTimeRef.current = 0;
      timerRef.current = setInterval(() => {
        setRecTime((prev) => {
          const next = prev + 1;
          recTimeRef.current = next;
          return next;
        });
      }, 1000);
    } catch {
      cleanup();
    }
  }, [cleanup]);

  const stopAndSave = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const duration = recTimeRef.current;
        if (audioChunksRef.current.length > 0 && duration > 0.5) {
          onAudioRecordedRef.current?.(audioBlob, duration);
        }
        cleanup();
        setIsRecording(false);
        onStateChangeRef.current?.("idle");
      };
    }
  }, [cleanup]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 h-10 animate-fade-in">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <div className="flex items-center gap-[1.5px] h-6">
            {waves.map((h, i) => (
              <div key={i} className="w-[2.5px] rounded-full bg-black/30 transition-all duration-75" style={{ height: `${h}px` }} />
            ))}
          </div>
        </div>
        <span className="text-[13px] font-semibold text-black tracking-tight tabular-nums">
          {formatTime(recTime)}
        </span>
        <button
          onClick={stopAndSave}
          className="w-8 h-8 rounded-lg bg-black flex items-center justify-center active:scale-90 transition"
        >
          <Square className="w-3 h-3 fill-white text-white" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="w-10 h-10 flex items-center justify-center active:scale-90 transition-all"
      title="Record voice note"
    >
      <Mic className="w-[19px] h-[19px] text-black/55 stroke-[1.6]" />
    </button>
  );
}
