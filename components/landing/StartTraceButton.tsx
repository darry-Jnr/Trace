"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

export default function StartTraceButton() {
  const router = useRouter();
  const [startingTrace, setStartingTrace] = useState(false);

  const prefetchTrace = useCallback(() => {
    router.prefetch(`/trace/prefetch`);
  }, [router]);

  const handleStartTrace = useCallback(() => {
    if (startingTrace) return;
    setStartingTrace(true);
    (window as any).pendo?.track("Start Trace CTA Clicked", { source: "landing_page" });
    const newId = Math.random().toString(36).substring(2, 9);
    router.push(`/trace/${newId}`);
  }, [startingTrace, router]);

  return (
    <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-10">
      <button
        onClick={handleStartTrace}
        onMouseEnter={prefetchTrace}
        onFocus={prefetchTrace}
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
  );
}
