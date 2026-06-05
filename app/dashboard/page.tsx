"use client";

import Navbar from "./components/Navbar";
import Main from "./components/Main";

const Dashboard = () => {
  return (
    // Adding bg-[#f5f5f7] makes the whole page feel like an Apple System UI
    <div className="min-h-screen bg-[#f5f5f7] text-black selection:bg-black/10">
      <Navbar />
      
      {/* 
        The pt-14 (or pt-16) compensates for the fixed navbar 
        so the top of the Main component isn't cut off.
      */}
      <main className="pt-14">
        <Main />
      </main>
    </div>
  );
};

export default Dashboard;