"use client";

interface LocationStatusProps {
  hasGpsFix: boolean;
  gpsTimedOut: boolean;
  onRetry: () => void;
}

export default function LocationStatus({ hasGpsFix, gpsTimedOut, onRetry }: LocationStatusProps) {
  return (
    <>
      {!hasGpsFix && !gpsTimedOut && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <div className="px-4 py-2 rounded-full bg-white/80 backdrop-blur-2xl border border-black/[0.05] shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-2.5">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-[#0052FF] opacity-75" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-[#0052FF]" />
            </span>
            <span className="text-[12px] font-medium text-black/60 tracking-tight">Finding your location...</span>
          </div>
        </div>
      )}
      {gpsTimedOut && !hasGpsFix && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <div className="px-4 py-2 rounded-full bg-white/80 backdrop-blur-2xl border border-black/[0.05] shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-2.5">
            <span className="text-[12px] font-medium text-black/40 tracking-tight">Location unavailable</span>
            <button
              onClick={onRetry}
              className="text-[12px] font-semibold text-[#0052FF] hover:text-black transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </>
  );
}
