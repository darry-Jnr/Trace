"use client";

import Link from "next/link";
import React from "react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-[#f5f5f7]/80 backdrop-blur-xl border-b border-black/[0.04]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-3 group"
        >
          {/* Custom Squircle Icon Frame */}
          <div className="w-9 h-9 rounded-[11px] bg-black flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] group-hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200">
            {/* Custom Dynamic Route Path SVG */}
            <svg 
              viewBox="0 0 24 24" 
              className="w-5 h-5 text-white"
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              {/* Starting anchor node */}
              <circle cx="6" cy="18" r="1.5" className="fill-white" />
              {/* Flowing trace line path */}
              <path d="M6 18C6 12 18 12 18 6" />
              {/* Ending target node */}
              <circle cx="18" cy="6" r="1.5" className="fill-white" />
            </svg>
          </div>

          <span className="text-[15px] font-semibold tracking-[-0.02em] text-black">
            Trace
          </span>
        </Link>

        {/* CTA Button */}
        <Link
          href="/dashboard"
          data-pendo="navbar-get-started"
          className="rounded-[16px] px-5 h-10 bg-black text-white text-sm font-medium flex items-center justify-center shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Get started
        </Link>
        
      </div>
    </header>
  );
}