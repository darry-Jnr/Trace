"use client";

import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen w-screen bg-neutral-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03] grid grid-cols-[repeat(16,minmax(0,1fr))] grid-rows-[repeat(16,minmax(0,1fr))] border border-white/5 pointer-events-none select-none">
        {Array.from({ length: 256 }).map((_, i) => (
          <div key={i} className="border border-white/5" />
        ))}
      </div>

      {/* Atmospheric glowing backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#0052FF]/10 blur-[100px] pointer-events-none -z-10 select-none animate-pulse duration-[8000ms]" />

      {/* Card Content wrapper */}
      <div className="flex flex-col items-center max-w-md w-full px-6 text-center z-10 select-none animate-slide-in">
        
        {/* The Lost GPS Path SVG */}
        <div className="relative mb-8 p-6 rounded-3xl bg-white/[0.02] border border-white/5 shadow-2xl backdrop-blur-sm select-none">
          <svg className="w-64 h-32 text-white/20" viewBox="0 0 200 100" fill="none" stroke="currentColor" strokeWidth={3}>
            {/* The stable starting path */}
            <path 
              d="M20,80 Q50,40 80,60" 
              stroke="#0052FF" 
              strokeLinecap="round" 
              strokeWidth={3.5}
            />
            {/* The broken lost drifting path */}
            <path 
              d="M80,60 T140,20 T180,45" 
              stroke="currentColor" 
              strokeLinecap="round" 
              strokeDasharray="6 6"
              className="opacity-60" 
            />
            {/* Pulsing red location marker at the end of the lost path */}
            <g transform="translate(180, 45)">
              <circle cx="0" cy="0" r="8" fill="#EF4444" className="animate-ping" style={{ transformOrigin: "0px 0px" }} />
              <circle cx="0" cy="0" r="4.5" fill="#EF4444" />
            </g>
          </svg>
        </div>

        {/* Text Details */}
        <div className="space-y-3.5 mb-10 select-none">
          <div className="inline-block px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-extrabold uppercase tracking-widest leading-none">
            Error 404
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-white font-sans">
            Path Not Found
          </h1>
          
          <p className="text-sm text-white/50 leading-relaxed font-medium font-sans px-4">
            You have drifted off the recorded coordinates. This trail does not exist or may have been deleted by its creator.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center select-none">
          <Link 
            href="/dashboard" 
            className="px-6 py-3.5 rounded-2xl bg-white text-black font-extrabold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all duration-300 shadow-xl text-center select-none"
          >
            Go to Dashboard
          </Link>

          <Link 
            href="/" 
            className="px-6 py-3.5 rounded-2xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/[0.08] text-white font-extrabold text-xs uppercase tracking-wider active:scale-95 transition-all duration-300 shadow-sm text-center select-none"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
