"use client";

import { useState, useEffect, useRef } from "react";

interface InitialLoaderProps {
  isLoading: boolean;
  loadingMessage: string;
  onRetry?: () => void;
}

export default function InitialLoader({
  isLoading,
  loadingMessage,
  onRetry,
}: InitialLoaderProps) {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);
  const prevLoadingRef = useRef(isLoading);

  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      setFadingOut(true);
      const timer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timer);
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-0 z-50 overflow-hidden bg-[#f5f5f7] flex items-center justify-center select-none transition-opacity duration-500 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
    >

      {/* Soft Background Glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[650px] h-[650px] rounded-full bg-[#dfe9ff] blur-3xl opacity-70" />
      </div>

      {/* Main Content */}
      <div className="relative flex flex-col items-center">

        {/* Loader Orb */}
        <div className="relative flex items-center justify-center">

          {/* Pulse Rings */}
          <div className="absolute w-28 h-28 rounded-full border border-[#0052FF]/10 animate-ping" />

          <div className="absolute w-20 h-20 rounded-full border border-[#0052FF]/10" />

          {/* Glass Card */}
          <div className="relative w-16 h-16 rounded-[22px] bg-white/80 backdrop-blur-2xl border border-white shadow-[0_10px_40px_rgba(0,82,255,0.10)] flex items-center justify-center">

            {/* Light Gradient */}
            <div className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-[#0052FF]/10 via-transparent to-transparent" />

            {/* Trace Logo */}
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7 text-black animate-[pulse_2.5s_ease-in-out_infinite]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle
                cx="6"
                cy="18"
                r="1.5"
                className="fill-current"
              />

              <path d="M6 18C6 12 18 12 18 6" />

              <circle
                cx="18"
                cy="6"
                r="1.5"
                className="fill-current"
              />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="mt-8 text-center">

          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-black">
            {loadingMessage}
          </h2>

          <p className="mt-1 text-[12px] font-medium tracking-tight text-black/35">
            {loadingMessage === "Could not find location" ? "GPS signal not found" : "Preparing your trace"}
          </p>

          {loadingMessage === "Could not find location" && onRetry && (
            <button
              onClick={onRetry}
              className="mt-6 px-6 h-11 rounded-[16px] bg-black text-white text-sm font-medium flex items-center justify-center gap-2 shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}