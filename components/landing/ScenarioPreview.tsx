"use client";

import { useState } from "react";

const SCENARIOS = [
  {
    id: "concert",
    label: "Concert",
    title: "Finding friends in a crowd",
    message: "I'm near the left speaker tower. Walk straight past the food stands.",
    type: "voice" as const,
  },
  {
    id: "home",
    label: "Guests",
    title: "Helping guests find your house",
    message: "Skip the first gate. Drive a little further and turn beside the yellow house.",
    type: "text" as const,
  },
  {
    id: "run",
    label: "Run",
    title: "Running with friends",
    message: "Construction ahead. Cross to the right side of the street here.",
    type: "photo" as const,
  },
];

export default function ScenarioPreview() {
  const [active, setActive] = useState("concert");
  const current = SCENARIOS.find((item) => item.id === active) || SCENARIOS[0];

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-1.5 bg-white p-1 rounded-full border border-black/[0.04] mb-6 lg:mb-8 overflow-x-auto max-w-full shadow-sm">
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => setActive(scenario.id)}
            className={`px-5 py-2 rounded-full text-xs font-semibold tracking-tight whitespace-nowrap transition-all ${
              active === scenario.id
                ? "bg-black text-white shadow-sm"
                : "text-black/40 hover:text-black/70"
            }`}
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-[350px] aspect-[9/18.5] bg-black rounded-[46px] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.12)] border border-white/10">
        <div className="w-full h-full bg-[#f4f4f6] rounded-[38px] overflow-hidden relative">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-30" />
          <div className="absolute inset-0 z-0 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.06]" />

          <svg className="absolute inset-0 w-full h-full z-10 px-8 py-16" viewBox="0 0 100 100" preserveAspectRatio="none">
            {active === "concert" && (
              <path d="M 10 90 C 20 60, 40 50, 50 45 C 60 40, 80 30, 90 10" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" />
            )}
            {active === "home" && (
              <path d="M 10 15 L 50 15 L 50 65 L 90 65" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {active === "run" && (
              <path d="M 90 90 C 70 65, 50 55, 45 45 C 40 35, 20 25, 10 10" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" />
            )}
          </svg>

          {active === "concert" && (
            <>
              <div className="absolute left-[33px] bottom-[65px] w-3 h-3 rounded-full bg-black border-2 border-white z-20" />
              <div className="absolute right-[33px] top-[65px] w-4 h-4 rounded-full bg-black ring-4 ring-black/10 border-2 border-white z-20" />
            </>
          )}
          {active === "home" && (
            <>
              <div className="absolute left-[33px] top-[55px] w-3 h-3 rounded-full bg-black border-2 border-white z-20" />
              <div className="absolute right-[33px] bottom-[115px] w-4 h-4 rounded-full bg-black ring-4 ring-black/10 border-2 border-white z-20" />
            </>
          )}
          {active === "run" && (
            <>
              <div className="absolute right-[33px] bottom-[65px] w-3 h-3 rounded-full bg-black border-2 border-white z-20" />
              <div className="absolute left-[33px] top-[65px] w-4 h-4 rounded-full bg-black ring-4 ring-black/10 border-2 border-white z-20" />
            </>
          )}

          <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20">
            <div className="w-13 h-13 rounded-full bg-black text-white flex items-center justify-center shadow-md border border-white/10">
              {current.type === "voice" && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
              {current.type === "text" && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              )}
              {current.type === "photo" && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </div>
            <span className="mt-2.5 text-[11px] font-semibold uppercase tracking-wider text-black/40">
              {current.type === "voice" && "Voice Point"}
              {current.type === "text" && "Note Point"}
              {current.type === "photo" && "Photo Point"}
            </span>
          </div>

          <div className="absolute left-4 right-4 bottom-4 bg-white rounded-[26px] border border-black/[0.04] p-4 shadow-lg z-20 flex flex-col">
            <p className="text-[11px] font-semibold text-black/35 uppercase tracking-wide mb-1.5">
              {current.title}
            </p>

            {current.type === "voice" && (
              <>
                <p className="text-[14px] font-medium leading-snug text-black/80 tracking-tight">
                  &ldquo;{current.message}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-2.5">
                  <button className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-sm">
                    <svg className="w-3.5 h-3.5 fill-white ml-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <div className="flex-1 flex items-center gap-[2px] h-7 px-1">
                    {Array.from({ length: 22 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-black/[0.08] rounded-full"
                        style={{ height: `${25 + (i % 4) * 22}%` }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {current.type === "text" && (
              <div className="bg-black/[0.02] border border-black/[0.02] rounded-xl p-3">
                <p className="text-[13px] font-medium leading-relaxed text-black/70 tracking-tight">
                  {current.message}
                </p>
              </div>
            )}

            {current.type === "photo" && (
              <div className="flex flex-col gap-2">
                <div className="aspect-[4/2.5] rounded-xl bg-black/[0.04] border border-black/[0.02] flex items-center justify-center overflow-hidden">
                  <svg className="w-8 h-8 text-black/15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375 0 010 .75z" />
                  </svg>
                </div>
                <p className="text-[13px] font-medium leading-tight text-black/60 tracking-tight">
                  {current.message}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs font-medium text-black/35 mt-6 text-center max-w-xs leading-relaxed tracking-tight">
        Built for concerts, weddings, campuses, meetups,
        neighborhoods, and places where maps are not enough.
      </p>
    </div>
  );
}
