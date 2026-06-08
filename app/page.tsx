"use client";

import { useState, useCallback } from "react";
import { LoaderCircle } from "lucide-react";

import { useRouter } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

interface Scenario {
  id: string;
  label: string;
  title: string;
  message: string;
  type: "voice" | "text" | "photo";
}

const SCENARIOS: Scenario[] = [
  {
    id: "concert",
    label: "Concert",
    title: "Finding friends in a crowd",
    message: "I'm near the left speaker tower. Walk straight past the food stands.",
    type: "voice",
  },
  {
    id: "home",
    label: "Guests",
    title: "Helping guests find your house",
    message: "Skip the first gate. Drive a little further and turn beside the yellow house.",
    type: "text",
  },
  {
    id: "run",
    label: "Run",
    title: "Running with friends",
    message: "Construction ahead. Cross to the right side of the street here.",
    type: "photo",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [active, setActive] = useState("concert");
  const [startingTrace, setStartingTrace] = useState(false);

  const handleStartTrace = useCallback(() => {
    if (startingTrace) return;
    setStartingTrace(true);
    const newId = Math.random().toString(36).substring(2, 9);
    setTimeout(() => router.push(`/trace/${newId}`), 500);
  }, [startingTrace]);

  const current = SCENARIOS.find((item) => item.id === active) || SCENARIOS[0];

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-black flex flex-col selection:bg-black selection:text-white">
      <Navbar />

      <main className="flex-1 overflow-hidden">
        <section className="px-6 md:px-10 pt-12 md:pt-24 pb-24">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-24 items-center">

            {/* LEFT COLUMN: Hero Copy & Features */}
            <div className="max-w-xl">
              {/* Small Label */}
              <p className="text-sm font-medium text-black/40 mb-5 tracking-tight">
                Maps show roads. People show the way.
              </p>

              {/* Hero Header */}
              <h1 className="text-5xl md:text-7xl font-semibold tracking-[-0.05em] leading-[0.95]">
                Show people exactly where to go.
              </h1>

              {/* Description */}
              <p className="mt-5 lg:mt-7 text-base lg:text-lg text-black/60 font-medium leading-relaxed tracking-tight">
                Walk the route once, leave photos, notes, or voice messages
                along the way, and share a single link. Friends follow your
                exact path and see everything at the right moments.
              </p>

              {/* Action Buttons (Using Custom Style Framework) */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-10">
                <button
                  onClick={handleStartTrace}
                  disabled={startingTrace}
                  className="rounded-[16px] px-7 h-13 bg-black text-white text-sm font-medium flex items-center justify-center gap-2 shadow-none transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-80"
                >
                  {startingTrace ? (
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                  ) : null}
                  <span>{startingTrace ? "Starting..." : "Start a Trace"}</span>
                </button>

                <button className="rounded-[16px] px-7 h-13 border border-black/10 bg-white text-black text-sm font-medium flex items-center justify-center transition-all hover:bg-black/[0.02] active:scale-[0.99]">
                  Watch demo
                </button>
              </div>

              {/* Steps Timeline Layout */}
              <div className="mt-10 lg:mt-20 space-y-6 lg:space-y-8 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-[1px] before:bg-black/[0.06]">
                <div className="flex gap-5 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold tracking-tight text-[15px]">Walk the route</h3>
                    <p className="text-sm font-medium text-black/45 mt-1 leading-normal tracking-tight">
                      Trace records your exact path as you move.
                    </p>
                  </div>
                </div>

                <div className="flex gap-5 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold tracking-tight text-[15px]">Add moments along the way</h3>
                    <p className="text-sm font-medium text-black/45 mt-1 leading-normal tracking-tight">
                      Leave photos, notes, or voice messages anywhere on the route.
                    </p>
                  </div>
                </div>

                <div className="flex gap-5 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold tracking-tight text-[15px]">Share one link</h3>
                    <p className="text-sm font-medium text-black/45 mt-1 leading-normal tracking-tight">
                      Friends follow your route instantly from their phone.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Device Preview Frame */}
            <div className="flex flex-col items-center">
              {/* Dynamic Interactive Scenario Tabs */}
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

              {/* High-fidelity Device View Container */}
              <div className="w-full max-w-[350px] aspect-[9/18.5] bg-black rounded-[46px] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.12)] border border-white/10">
                <div className="w-full h-full bg-[#f4f4f6] rounded-[38px] overflow-hidden relative">
                  
                  {/* Speaker Punch-out Element */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-30" />

                  {/* Minimal Spatial Map Dot Grid Canvas */}
                  <div className="absolute inset-0 z-0 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.06]" />

                  {/* Programmatic Trace Route Vectors */}
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

                  {/* Absolute Target Coordinate Nodes */}
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

                  {/* Anchor Pin Context Button Overlay */}
                  <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20">
                    <div className="w-13 h-13 rounded-full bg-black text-white flex items-center justify-center shadow-md border border-white/10">
                      {/* Render Conditional Vectors based on types */}
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

                  {/* Unified Content Card Sheet Overlay */}
                  <div className="absolute left-4 right-4 bottom-4 bg-white rounded-[26px] border border-black/[0.04] p-4 shadow-lg z-20 flex flex-col">
                    <p className="text-[11px] font-semibold text-black/35 uppercase tracking-wide mb-1.5">
                      {current.title}
                    </p>

                    {/* Scenario Type Block Renderers */}
                    {current.type === "voice" && (
                      <>
                        <p className="text-[14px] font-medium leading-snug text-black/80 tracking-tight">
                          “{current.message}”
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

              {/* Bottom Target Framework Text */}
              <p className="text-xs font-medium text-black/35 mt-6 text-center max-w-xs leading-relaxed tracking-tight">
                Built for concerts, weddings, campuses, meetups,
                neighborhoods, and places where maps are not enough.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Start Trace transition overlay */}
      {startingTrace && (
        <div className="fixed inset-0 z-[100] pointer-events-none animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0052FF] via-[#4f8cff] to-[#a8c8ff] opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.3),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,82,255,0.4),transparent_60%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <p className="text-white/80 text-sm font-medium tracking-tight">Preparing your trace...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}