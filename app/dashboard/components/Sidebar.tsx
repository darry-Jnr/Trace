"use client";

import React from "react";

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    isRecording: boolean;
    setIsRecording: (recording: boolean) => void;
    tracePath: [number, number][];
}

export default function Sidebar({
    sidebarOpen,
    setSidebarOpen,
    isRecording,
    setIsRecording,
    tracePath = [],
}: SidebarProps) {
    return (
        <div
            className={`
                hidden lg:flex
                flex-col
                justify-between
                border-r
                border-black/5
                bg-white
                transition-all
                duration-300
                overflow-hidden
                shrink-0
                ${
                    sidebarOpen
                        ? "w-[320px] p-6"
                        : "w-0 p-0"
                }
            `}
        >
            <div className="space-y-6">
                {/* Menu Toggle inside Sidebar top */}
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="w-11 h-11 rounded-2xl border border-black/5 flex items-center justify-center hover:bg-black/[0.03] transition shadow-sm bg-white active:scale-95 cursor-pointer"
                    aria-label="Close Menu"
                >
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="space-y-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#0052FF]">
                        Live Trace
                    </p>

                    <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 leading-tight">
                        Record routes.
                    </h1>

                    <p className="text-sm text-black/50 leading-relaxed font-medium">
                        Help people find difficult places with real-world directions.
                    </p>
                </div>

                {/* Telemetries */}
                <div className="rounded-2xl border border-black/5 p-4 bg-[#fafafa] space-y-1 select-none">
                    <p className="text-[10px] font-bold text-black/40 uppercase tracking-wider">
                        Recorded Points
                    </p>
                    <p className="text-sm font-bold tracking-tight text-black">
                        {tracePath.length} points logged
                    </p>
                </div>
            </div>

            <button
                onClick={() => setIsRecording(!isRecording)}
                className={`
                    h-14
                    rounded-2xl
                    text-sm
                    font-bold
                    transition-all
                    duration-300
                    active:scale-95
                    cursor-pointer
                    border
                    ${
                        isRecording
                            ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100/50"
                            : "bg-black text-white border-transparent hover:bg-black/90 shadow-md shadow-black/10"
                    }
                `}
            >
                {isRecording ? "Stop Recording" : "Start Recording"}
            </button>
        </div>
    );
}
