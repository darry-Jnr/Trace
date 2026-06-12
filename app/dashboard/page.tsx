"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/dashboard/Navbar";
import Main from "@/components/dashboard/Main";
import MobileNudge from "@/components/dashboard/MobileNudge";

const SESSION_KEY = "dismissed_mobile_nudge";

const Dashboard = () => {
  const [bannerDismissed, setBannerDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBannerDismissed(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setBannerDismissed(true);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-black selection:bg-black/10">
      <Navbar />
      <MobileNudge dismissed={bannerDismissed} onDismiss={handleDismiss} />
      <main className={`transition-all duration-300 ${bannerDismissed ? "pt-16" : "pt-16 md:pt-32"}`}>
        <Main />
      </main>
    </div>
  );
};

export default Dashboard;
