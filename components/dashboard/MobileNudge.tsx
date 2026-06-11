"use client";

import { X, Smartphone } from "lucide-react";

const SESSION_KEY = "dismissed_mobile_nudge";

interface Props {
  dismissed: boolean;
  onDismiss: () => void;
}

export default function MobileNudge({ dismissed, onDismiss }: Props) {
  if (dismissed) return null;

  return (
    <div className="hidden md:flex fixed top-16 inset-x-0 z-40 justify-center px-6">
      <div className="max-w-4xl w-full flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-200/60 rounded-xl shadow-sm mt-3">
        <Smartphone className="w-4 h-4 text-amber-700 shrink-0" />
        <p className="text-[13px] font-medium text-amber-900 leading-relaxed">
          Trace works best on mobile — record routes, drop notes, and capture photos right from your phone.
        </p>
        <button
          onClick={onDismiss}
          className="ml-auto shrink-0 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-amber-200/60 active:scale-90 transition-all"
        >
          <X className="w-3.5 h-3.5 text-amber-700" />
        </button>
      </div>
    </div>
  );
}
