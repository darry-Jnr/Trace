"use client";

import dynamic from "next/dynamic";

const MapboxInnerMap = dynamic(() => import("./MapboxInnerMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full min-h-[400px] rounded-2xl bg-[#fafafa] animate-pulse flex items-center justify-center border border-black/5">
            <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-[#0052FF]/10 border-t-[#0052FF] animate-spin" />
                <span className="text-xs text-neutral-400 font-semibold tracking-wide">
                    Initializing map...
                </span>
            </div>
        </div>
    ),
});

interface TraceMapProps {
    userLocation: [number, number] | null;
    tracePath: [number, number][];
    onZoomChange?: (zoom: number) => void;
}

export default function TraceMap({
    userLocation,
    tracePath,
    onZoomChange,
}: TraceMapProps) {
    return (
        <MapboxInnerMap
            userLocation={userLocation}
            tracePath={tracePath}
            onZoomChange={onZoomChange}
        />
    );
}
