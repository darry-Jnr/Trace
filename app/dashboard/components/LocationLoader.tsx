"use client";

import React from "react";

export default function LocationLoader({
    status,
    onRetry,
}: {
    status: "loading" | "connected" | "error";
    onRetry: () => void;
}) {
    if (status === "connected") return null;

    return (
        <div className="absolute inset-0 z-[1000] bg-white/75 backdrop-blur-md flex items-center justify-center select-none animate-[fadeIn_0.3s_ease-out]">
            <div 
                className="w-[300px] rounded-3xl bg-white border border-black/5 p-6 shadow-2xl text-center animate-slide-in"
                style={{
                    boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.12), 0 0 1px 0 rgba(0, 0, 0, 0.05)",
                }}
            >
                {status === "loading" ? (
                    <div className="flex flex-col items-center select-none">
                        <div className="relative w-16 h-16 flex items-center justify-center mb-5">
                            <div 
                                className="absolute inset-0 rounded-full bg-[#0052FF]/10 animate-ping opacity-75" 
                                style={{ animationDuration: "2.5s" }}
                            />
                            <div className="w-12 h-12 rounded-full border-4 border-black/[0.06] border-t-black animate-spin" />
                        </div>

                        <h2 className="text-lg font-bold tracking-tight text-neutral-900 leading-tight font-sans">
                            Finding your location
                        </h2>

                        <p className="mt-2 text-xs text-neutral-500 font-medium leading-relaxed font-sans px-3">
                            This usually takes a few seconds.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center select-none">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shadow-[0_8px_30px_rgba(239,68,68,0.1)] mb-5 animate-pulse">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        <h2 className="text-lg font-bold tracking-tight text-neutral-900 leading-tight font-sans">
                            Location unavailable
                        </h2>

                        <p className="mt-2 text-xs text-neutral-500 font-medium leading-relaxed font-sans px-2">
                            Please allow location access and try again.
                        </p>

                        <button
                            onClick={onRetry}
                            className="mt-6 w-full h-12 rounded-2xl bg-black hover:bg-neutral-900 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-black/10 transition duration-300 active:scale-[0.97]"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5" />
                            </svg>
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
