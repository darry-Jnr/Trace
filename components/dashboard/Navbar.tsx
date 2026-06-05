"use client";

import Link from "next/link";
import React, { useMemo } from "react";

import {
  Sunrise,
  Sun,
  Sunset,
  MoonStar,
} from "lucide-react";

const Navbar = () => {

  const hour = new Date().getHours();

  const phase = useMemo(() => {

    // Dawn
    if (hour >= 5 && hour < 8) {
      return {
        greeting: "Good morning",
        icon: Sunrise,
        iconClass:
          "text-rose-400",
      };
    }

    // Day
    if (hour >= 8 && hour < 17) {
      return {
        greeting: "Good afternoon",
        icon: Sun,
        iconClass:
          "text-amber-400",
      };
    }

    // Sunset
    if (hour >= 17 && hour < 20) {
      return {
        greeting: "Good evening",
        icon: Sunset,
        iconClass:
          "text-orange-400",
      };
    }

    // Night
    return {
      greeting: "Good night",
      icon: MoonStar,
      iconClass:
        "text-indigo-300",
    };

  }, [hour]);

  const GreetingIcon = phase.icon;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#f5f5f3]/80 backdrop-blur-xl border-b border-black/[0.04]">

      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-3 group"
        >

          {/* Logo */}
          <div className="w-9 h-9 rounded-[12px] bg-black flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-transform duration-200 group-hover:scale-[1.02] active:scale-[0.98]">

            <svg
              viewBox="0 0 24 24"
              className="w-[18px] h-[18px] text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Start Point */}
              <circle
                cx="6"
                cy="18"
                r="1.5"
                className="fill-white"
              />

              {/* Trace Path */}
              <path d="M6 18C6 12 18 12 18 6" />

              {/* End Point */}
              <circle
                cx="18"
                cy="6"
                r="1.5"
                className="fill-white"
              />
            </svg>
          </div>

          {/* Brand Name */}
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-black">
            Trace
          </span>
        </Link>

        {/* Time Mood */}
        <div className="flex items-center gap-2">

          <GreetingIcon
            className={`w-4 h-4 stroke-[2.3] transition-colors duration-700 ${phase.iconClass}`}
          />

          <p className="text-[13px] font-medium tracking-tight text-black/45">
            {phase.greeting}
          </p>
        </div>

      </div>
    </header>
  );
};

export default Navbar;