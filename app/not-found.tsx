"use client";

import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen w-screen bg-[#f5f5f7] flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-black selection:text-white">
      
      {/* Background spatial map dot grid canvas to match landing page */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.04] pointer-events-none select-none" />

      {/* Main Content Card Wrapper */}
      <div className="flex flex-col items-center max-w-sm w-full px-6 text-center z-10 select-none animate-fade-in">
        
        {/* The Lost GPS Path Visual Vector Card */}
        <div className="relative w-full aspect-[2/1] mb-8 bg-white rounded-[26px] border border-black/[0.04] shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-4 flex items-center justify-center">
          <svg className="w-full h-full text-black/[0.12]" viewBox="0 0 200 100" fill="none" stroke="currentColor" strokeWidth={3}>
            {/* The stable starting dynamic trace path */}
            <path 
              d="M 20 80 C 40 60, 60 55, 80 50" 
              stroke="black" 
              strokeLinecap="round" 
              strokeWidth={3.5}
            />
            {/* The broken lost drifting path vector */}
            <path 
              d="M 80 50 C 100 45, 120 20, 140 30 C 160 40, 170 60, 180 55" 
              stroke="currentColor" 
              strokeLinecap="round" 
              strokeDasharray="5 5"
            />
            {/* Warning point location indicator at the tip of the lost vector */}
            <g transform="translate(180, 55)">
              <circle cx="0" cy="0" r="8" fill="#FF3B30" className="animate-ping opacity-25" style={{ transformOrigin: "0px 0px" }} />
              <circle cx="0" cy="0" r="3.5" fill="#FF3B30" className="stroke-white" strokeWidth={1} />
            </g>
          </svg>
        </div>

        {/* Text Copy Details */}
        <div className="space-y-3 mb-10">
          <div className="inline-block px-3 py-1 rounded-full bg-black/[0.04] border border-black/[0.02] text-black/45 text-[10px] font-bold uppercase tracking-wider leading-none">
            Error 404
          </div>
          
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-black">
            Path Not Found
          </h1>
          
          <p className="text-sm font-medium text-black/45 leading-relaxed tracking-tight px-2">
            You have drifted off the recorded coordinates. This trail does not exist or may have been deleted by its creator.
          </p>
        </div>

        {/* Dynamic Action Buttons (Matching Custom Framework) */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Link 
            href="/dashboard" 
            className="flex-1 rounded-[16px] px-6 h-12 bg-black text-white text-sm font-medium flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Dashboard
          </Link>

          <Link 
            href="/" 
            className="flex-1 rounded-[16px] px-6 h-12 border border-black/10 bg-white text-black text-sm font-medium flex items-center justify-center transition-all hover:bg-black/[0.02] active:scale-[0.99]"
          >
            Back Home
          </Link>
        </div>

      </div>
    </div>
  );
}