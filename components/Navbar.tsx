"use client";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-[#f5f5f7]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center text-sm font-medium">
            T
          </div>

          <span className="text-[15px] font-medium tracking-tight">
            Trace
          </span>
        </div>

        {/* CTA */}
        <button className="px-5 py-2 rounded-full bg-black text-white text-sm font-medium transition hover:opacity-90">
          Get started
        </button>
      </div>
    </header>
  );
}