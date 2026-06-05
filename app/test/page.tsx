"use client";

import React from "react";
import { useToast } from "@/components/ui/Toast";

export default function ToastTestPage() {
  // Access our redesigned brand toast triggers
  const toast = useToast();

  return (
    <div className="min-h-screen w-screen bg-[#f5f5f7] flex flex-col items-center justify-center p-6 selection:bg-black selection:text-white">
      
      {/* Background spatial map dot grid canvas to match your layout */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.04] pointer-events-none select-none" />

      <div className="max-w-md w-full text-center z-10">
        {/* Header Block */}
        <div className="mb-10">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-black/[0.04] border border-black/[0.02] text-black/45 text-[10px] font-bold uppercase tracking-wider mb-3">
            System Utility
          </span>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-black">
            Toast Testing Panel
          </h1>
          <p className="text-sm font-medium text-black/45 mt-2 tracking-tight">
            Click the nodes below to trigger the top-centered notification system.
          </p>
        </div>

        {/* Buttons Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full bg-white p-5 rounded-[24px] border border-black/[0.04] shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          
          {/* Success Trigger */}
          <button
            onClick={() => 
              toast.success("Trace Saved Successfully", "Your coordinate trail has been committed to your local dashboard workspace.")
            }
            className="rounded-[14px] border border-black/10 bg-white text-black text-xs font-semibold h-11 flex items-center justify-center transition-all hover:bg-black/[0.02] active:scale-[0.98]"
          >
            Trigger Success
          </button>

          {/* Info Trigger */}
          <button
            onClick={() => 
              toast.info("GPS Connection Active", "High-accuracy geolocation tracking stream established with your device satellites.")
            }
            className="rounded-[14px] border border-black/10 bg-white text-black text-xs font-semibold h-11 flex items-center justify-center transition-all hover:bg-black/[0.02] active:scale-[0.98]"
          >
            Trigger Info
          </button>

          {/* Warning Trigger */}
          <button
            onClick={() => 
              toast.warning("Weak Satellite Telemetry", "Your GPS precision bounds are expanding. Move clear of tall architectural structures.")
            }
            className="rounded-[14px] border border-black/10 bg-white text-black text-xs font-semibold h-11 flex items-center justify-center transition-all hover:bg-black/[0.02] active:scale-[0.98]"
          >
            Trigger Warning
          </button>

          {/* Error Trigger */}
          <button
            onClick={() => 
              toast.error("Recording Session Failed", "Unable to capture baseline coordinates. Verify browser location sharing permissions.")
            }
            className="rounded-[14px] border border-black/10 bg-white text-black text-xs font-semibold h-11 flex items-center justify-center transition-all hover:bg-black/[0.02] active:scale-[0.98]"
          >
            Trigger Error
          </button>

        </div>

        {/* Dynamic Micro-Help Text */}
        <p className="text-[11px] font-medium text-black/30 mt-6 max-w-xs mx-auto leading-normal tracking-tight">
          Toasts stack programmatically. Newest alerts slide in at the top and automatically fade away after 4 seconds.
        </p>
      </div>
    </div>
  );
}