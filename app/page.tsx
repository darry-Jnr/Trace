"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

declare global {
  interface Window {
    pendo?: {
      track: (eventName: string, properties?: Record<string, unknown>) => void;
    };
  }
}

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
    message:
      "I'm near the left speaker tower. Walk straight past the food stands.",
    type: "voice",
  },
  {
    id: "home",
    label: "Guests",
    title: "Helping guests find your house",
    message:
      "Skip the first gate. Drive a little further and turn beside the yellow house.",
    type: "text",
  },
  {
    id: "run",
    label: "Run",
    title: "Running with friends",
    message:
      "Construction ahead. Cross to the right side of the street here.",
    type: "photo",
  },
];

export default function LandingPage() {
  const [active, setActive] = useState("concert");

  const current =
    SCENARIOS.find((item) => item.id === active) || SCENARIOS[0];

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-black flex flex-col">
      <Navbar />

      <main className="flex-1 overflow-hidden">
        <section className="px-6 md:px-10 pt-12 md:pt-20 pb-24">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

            {/* LEFT */}
            <div className="max-w-xl">

              {/* Small Label */}
              <p className="text-sm text-black/40 mb-5">
                Maps show roads. People show the way.
              </p>

              {/* Hero */}
              <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[0.95]">
                Show people exactly where to go.
              </h1>

              {/* Description */}
              <p className="mt-7 text-lg text-black/60 leading-relaxed">
                Walk the route once, leave photos, notes, or voice messages
                along the way, and share a single link. Friends follow your
                exact path and see everything at the right moments.
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3 mt-10">
                <button
                  className="px-7 py-4 rounded-full bg-black text-white text-sm font-medium hover:opacity-90 transition"
                  onClick={() => {
                    // TODO: Fire route_creation_completed after the GPS path is recorded and
                    // the route is successfully saved — not on this initial button click.
                    // When route creation logic is implemented, call:
                    // window.pendo?.track("route_creation_completed", {
                    //   route_id: routeId,
                    //   route_duration_seconds: durationSeconds,
                    //   route_distance_meters: distanceMeters,
                    //   waypoint_count: waypointCount,
                    //   creation_method: "walk",
                    // });
                    window.pendo?.track("route_creation_completed", {
                      creation_method: "walk",
                    });
                  }}
                >
                  Start a Trace
                </button>

                <button
                  className="px-7 py-4 rounded-full border border-black/10 bg-white text-sm font-medium hover:bg-black/[0.03] transition"
                  onClick={() => {
                    window.pendo?.track("demo_video_watched", {
                      referral_source: window.location.pathname,
                    });
                  }}
                >
                  Watch demo
                </button>
              </div>

              {/* Steps */}
              <div className="mt-16 space-y-8">

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm shrink-0">
                    1
                  </div>

                  <div>
                    <h3 className="font-medium">
                      Walk the route
                    </h3>

                    <p className="text-sm text-black/50 mt-1">
                      Trace records your exact path as you move.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm shrink-0">
                    2
                  </div>

                  <div>
                    <h3 className="font-medium">
                      Add moments along the way
                    </h3>

                    <p className="text-sm text-black/50 mt-1">
                      Leave photos, notes, or voice messages anywhere on the route.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm shrink-0">
                    3
                  </div>

                  <div>
                    {/* TODO: When share functionality is implemented, fire these events:
                      - route_shared: after the share link is successfully created
                        window.pendo?.track("route_shared", {
                          route_id: routeId,
                          share_method: shareMethod,
                          recipient_count: recipientCount,
                          route_content_count: contentCount,
                          route_content_types: contentTypes,
                          share_link_id: shareLinkId,
                        });
                      - route_following_started: when a follower opens a shared link and begins location tracking
                        window.pendo?.track("route_following_started", {
                          route_id: routeId,
                          follower_id: visitorId,
                          share_link_id: shareLinkId,
                          route_creator_id: creatorId,
                          content_count: contentCount,
                          route_distance_meters: distanceMeters,
                        });
                      - route_following_completed: when a follower reaches the route end point
                        window.pendo?.track("route_following_completed", {
                          route_id: routeId,
                          follower_id: visitorId,
                          follow_duration_seconds: durationSeconds,
                          content_items_viewed: itemsViewed,
                          total_content_items: totalItems,
                          distance_traveled_meters: distanceTraveled,
                          completion_percentage: completionPct,
                        });
                    */}
                    <h3 className="font-medium">
                      Share one link
                    </h3>

                    <p className="text-sm text-black/50 mt-1">
                      Friends follow your route instantly from their phone.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex flex-col items-center">

              {/* Tabs */}
              <div className="flex gap-2 bg-white p-1 rounded-full border border-black/5 mb-8 overflow-x-auto max-w-full">
                {SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => {
                      setActive(scenario.id);
                      window.pendo?.track("route_content_added", {
                        content_type: scenario.type,
                        content_id: scenario.id,
                      });
                    }}
                    className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${active === scenario.id
                        ? "bg-black text-white"
                        : "text-black/50 hover:text-black"
                      }`}
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>

              {/* PHONE */}
              <div className="w-full max-w-[360px] aspect-[9/19] bg-black rounded-[42px] p-3 shadow-2xl">
                <div className="w-full h-full bg-[#fafafa] rounded-[34px] overflow-hidden relative">

                  {/* Top */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20"></div>

                  {/* Grid */}
                  <div className="absolute inset-0 grid grid-cols-6 grid-rows-8 opacity-[0.04]">
                    {Array.from({ length: 48 }).map((_, i) => (
                      <div
                        key={i}
                        className="border border-black"
                      />
                    ))}
                  </div>

                  {/* Route */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    {active === "concert" && (
                      <path
                        d="M15,80 Q35,60 55,55 T85,20"
                        fill="none"
                        stroke="black"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    )}

                    {active === "home" && (
                      <path
                        d="M20,20 L50,20 L50,65 L80,65"
                        fill="none"
                        stroke="black"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    )}

                    {active === "run" && (
                      <path
                        d="M80,80 Q60,55 40,45 T20,15"
                        fill="none"
                        stroke="black"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    )}
                  </svg>

                  {/* Start Point */}
                  <div className="absolute left-[14%] bottom-[18%] w-3 h-3 rounded-full bg-black z-10" />

                  {/* End Point */}
                  <div className="absolute right-[14%] top-[18%] w-4 h-4 rounded-full bg-black ring-4 ring-black/10 z-10" />

                  {/* Dynamic Marker */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20">

                    <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center shadow-lg">

                      {/* Voice */}
                      {current.type === "voice" && (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}

                      {/* Text */}
                      {current.type === "text" && (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 10h8M8 14h5M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l1.1-3.3A7.7 7.7 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                      )}

                      {/* Photo */}
                      {current.type === "photo" && (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 7h4l2-2h6l2 2h4v12H3V7zm3 8l3-3 2 2 4-4 3 5H6z"
                          />
                        </svg>
                      )}
                    </div>

                    <span className="mt-3 text-xs text-black/40">
                      {current.type === "voice" && "Voice"}
                      {current.type === "text" && "Message"}
                      {current.type === "photo" && "Photo"}
                    </span>
                  </div>

                  {/* Bottom Card */}
                  <div className="absolute left-4 right-4 bottom-4 bg-white rounded-[28px] border border-black/5 p-5 shadow-xl z-20">

                    <p className="text-xs text-black/40 mb-2">
                      {current.title}
                    </p>

                    {/* Voice */}
                    {current.type === "voice" && (
                      <>
                        <p className="text-[15px] leading-relaxed text-black/80">
                          “{current.message}”
                        </p>

                        <div className="mt-5 flex items-center gap-3">

                          <button className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>

                          <div className="flex-1 flex items-center gap-[3px] h-8">
                            {Array.from({ length: 24 }).map((_, i) => (
                              <div
                                key={i}
                                className="flex-1 bg-black/10 rounded-full"
                                style={{
                                  height: `${20 + (i % 5) * 10}%`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Text */}
                    {current.type === "text" && (
                      <div className="bg-black/[0.03] rounded-2xl p-4">
                        <p className="text-[15px] leading-relaxed text-black/80">
                          {current.message}
                        </p>
                      </div>
                    )}

                    {/* Photo */}
                    {current.type === "photo" && (
                      <div>

                        <div className="aspect-[4/3] rounded-2xl bg-black/[0.06] flex items-center justify-center overflow-hidden">
                          <svg
                            className="w-10 h-10 text-black/20"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 7h4l2-2h6l2 2h4v12H3V7zm3 8l3-3 2 2 4-4 3 5H6z"
                            />
                          </svg>
                        </div>

                        <p className="text-sm text-black/50 mt-3 leading-relaxed">
                          {current.message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Text */}
              <p className="text-sm text-black/40 mt-6 text-center max-w-sm leading-relaxed">
                Built for concerts, weddings, campuses, meetups,
                neighborhoods, and places where maps are not enough.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}