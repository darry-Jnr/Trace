"use client";

import { useEffect, useState } from "react";
import { X, Smartphone } from "lucide-react";

const SESSION_KEY = "dismissed_mobile_nudge";

export default function MobileNudge() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="hidden md:flex fixed top-16 inset-x-0 z-40 items-center justify-center px-6 py-3 bg-amber-50 border-b border-amber-200/60">
      <div className="flex items-center gap-3 max-w-7xl w-full">
        <Smartphone className="w-4 h-4 text-amber-700 shrink-0" />
        <p className="text-[13px] font-medium text-amber-900 leading-relaxed">
          Trace works best on mobile — record routes, drop notes, and capture photos right from your phone.
        </p>
        <button
          onClick={handleDismiss}
          className="ml-auto shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-amber-200/60 active:scale-90 transition-all"
        >
          <X className="w-3.5 h-3.5 text-amber-700" />
        </button>
      </div>
    </div>
  );
}
