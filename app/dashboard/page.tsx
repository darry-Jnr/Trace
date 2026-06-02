"use client";

import { useState } from "react";

// components
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import TraceMap from "./components/TraceMap";
import LocationLoader from "./components/LocationLoader";
import FloatingNote from "./components/FloatingNote";

// hooks
import { useUserLocation } from "./hooks/useUserLocation";
import { useTraceRecording } from "./hooks/useTraceRecording";

export default function DashboardPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const {
        userLocation,
        locationStatus,
        retryLocation,
    } = useUserLocation();

    const {
        isRecording,
        setIsRecording,
        tracePath,
    } = useTraceRecording(userLocation);

    return (
        <div className="h-screen w-screen overflow-hidden bg-white flex flex-col font-sans">
            {/* Pre-load Leaflet CSS during loading state to prevent layout flashes */}
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
            />

            <Navbar userLocation={userLocation} />

            <div className="flex-1 flex overflow-hidden relative">
                {/* desktop sidebar */}
                <Sidebar
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    isRecording={isRecording}
                    setIsRecording={setIsRecording}
                    tracePath={tracePath}
                />

                {/* map area */}
                <div className="flex-1 relative">
                    {/* Floating Menu Toggle when sidebar is closed */}
                    {!sidebarOpen && (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="
                                absolute
                                top-4
                                left-4
                                z-[1001]
                                h-11
                                px-4
                                rounded-2xl
                                bg-white/95
                                backdrop-blur
                                border
                                border-black/5
                                shadow-lg
                                flex
                                items-center
                                justify-center
                                text-sm
                                font-bold
                                active:scale-[0.98]
                                transition
                                cursor-pointer
                            "
                        >
                            Menu
                        </button>
                    )}

                    <TraceMap
                        userLocation={userLocation}
                        tracePath={tracePath}
                    />

                    <LocationLoader
                        status={locationStatus}
                        onRetry={retryLocation}
                    />

                    {locationStatus === "connected" && (
                        <>
                            <FloatingNote />

                            {/* mobile record button */}
                            <button
                                onClick={() =>
                                    setIsRecording(!isRecording)
                                }
                                className={`
                                    lg:hidden
                                    absolute
                                    bottom-6
                                    left-1/2
                                    -translate-x-1/2
                                    z-[1001]
                                    h-14
                                    px-7
                                    rounded-full
                                    text-sm
                                    font-bold
                                    shadow-xl
                                    transition
                                    active:scale-[0.98]
                                    cursor-pointer
                                    ${
                                        isRecording
                                            ? "bg-red-500 text-white"
                                            : "bg-black text-white"
                                    }
                                `}
                            >
                                {isRecording
                                    ? "Stop"
                                    : "Record"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}