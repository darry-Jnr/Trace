"use client";

import Navbar from "@/components/dashboard/Navbar";
import Main from "@/components/dashboard/Main";
import MobileNudge from "@/components/dashboard/MobileNudge";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-black selection:bg-black/10">
      <Navbar />
      <MobileNudge />
      <main className="pt-14">
        <Main />
      </main>
    </div>
  );
};

export default Dashboard;