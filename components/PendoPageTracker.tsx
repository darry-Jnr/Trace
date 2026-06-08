"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PendoPageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).pendo?.isReady?.()) {
      (window as any).pendo.pageLoad();
    }
  }, [pathname]);

  return null;
}
