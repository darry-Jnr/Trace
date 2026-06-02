"use client";

import Link from "next/link";

interface NavbarProps {
  zoomPercent?: number;
  userLocation?: [number, number] | null;
}

export default function DashboardNavbar({ zoomPercent = 100, userLocation = null }: NavbarProps) {
  return (
    <header className="h-16 shrink-0 border-b border-black/5 bg-white px-6 flex items-center justify-between z-[1000] select-none">
      <Link href="/" className="flex items-center gap-3 hover:opacity-85 transition">
        <div className="w-8 h-8 rounded-2xl bg-black text-white flex items-center justify-center text-sm font-bold">
          T
        </div>

        <p className="text-sm font-bold tracking-tight">
          Trace
        </p>
      </Link>

      <div className="flex items-center gap-2.5">
        <div className="px-2.5 py-1 rounded-full bg-black/[0.04] text-[11px] font-bold text-black/50">
          Zoom: {zoomPercent}%
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-black/40">
          <div
            className={`w-2 h-2 rounded-full ${
              userLocation ? "bg-green-500 animate-pulse" : "bg-black/20"
            }`}
          />
          {userLocation ? "GPS Connected" : "GPS Locating"}
        </div>
      </div>
    </header>
  );
}
