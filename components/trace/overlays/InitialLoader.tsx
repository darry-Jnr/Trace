
"use client";

import { useEffect, useRef, useState } from "react";

interface InitialLoaderProps {
  isLoading: boolean;
  loadingMessage: string
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
    if (isLoading) {
      setVisible(true);
      setFadingOut(false);
      prevLoadingRef.current = true;
      return;
    }

    if (prevLoadingRef.current) {
      setFadingOut(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 700);

      return () => clearTimeout(timer);
    }

    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  if (!visible) return null;

  const isError = loadingMessage === "Could not find location";

  return (
    <div
      className={`absolute inset-0 z-50 bg-[#f5f5f7] overflow-hidden transition-opacity duration-700 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
    >

      {/* Background */}
      <div className="absolute inset-0">

        {/* Glow */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#dfe8ff] blur-3xl opacity-70" />

        {/* Noise */}
        <div className="absolute inset-0 opacity-[0.015] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:22px_22px]" />

      </div>

      {/* Center */}
      <div className="relative h-full flex flex-col items-center justify-center px-6">

        {/* Animated Route */}
        <div className="relative w-[240px] h-[120px]">

          <svg
            viewBox="0 0 240 120"
            className="absolute inset-0 w-full h-full"
            fill="none"
          >

            {/* Route Path */}
            <path
              d="M20 90C60 20 120 20 150 70C170 100 210 90 220 35"
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Animated Progress */}
            <path
              d="M20 90C60 20 120 20 150 70C170 100 210 90 220 35"
              stroke="#111111"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="260"
              strokeDashoffset="260"
              className="animate-trace-flow"
            />

          </svg>

          {/* Moving Dot */}
          <div className="absolute inset-0 w-full h-full pointer-events-none">

            <div className="relative w-0 h-0 animate-dot-flow">

              <div className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2">

                <div className="absolute inset-0 rounded-full bg-black/10 animate-ping" />

                <div className="w-4 h-4 rounded-full bg-black border-4 border-white shadow-lg" />

              </div>

            </div>

          </div>

        </div>

        {/* Text */}
        <div className="mt-14 text-center">

          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-black">
            {isError
              ? "Location unavailable"
              : "Preparing your route"}
          </h2>

          <p className="mt-2 text-[14px] text-black/40 tracking-tight leading-relaxed max-w-[280px]">
            {isError
              ? "Turn on location access to continue using Trace"
              : "Getting your map, position, and moments ready"}
          </p>

          {/* Retry */}
          {isError && onRetry && (
            <button
              onClick={onRetry}
              className="mt-7 h-11 px-5 rounded-full bg-black text-white text-[13px] font-medium tracking-tight hover:opacity-95 active:scale-[0.98] transition-all"
            >
              Try Again
            </button>
          )}

        </div>

      </div>
    </div>
  );
}

