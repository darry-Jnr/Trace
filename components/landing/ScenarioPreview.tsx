"use client";

function MapContent() {
  return (
    <div className="absolute inset-0 z-10">
      {/* Street grid background */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <rect width="100" height="100" fill="#f0f0f3" />
        <rect x="55" y="10" width="18" height="20" rx="3" fill="#d4e8d0" opacity="0.6" />
        <rect x="8" y="50" width="14" height="22" rx="4" fill="#d4e8d0" opacity="0.5" />
        <circle cx="78" cy="70" r="12" fill="#d4e8d0" opacity="0.4" />
      </svg>

      {/* Roads */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="0" y1="35" x2="100" y2="35" stroke="white" strokeWidth="2.5" opacity="0.9" />
        <line x1="0" y1="65" x2="100" y2="65" stroke="white" strokeWidth="2.5" opacity="0.9" />
        <line x1="30" y1="0" x2="30" y2="100" stroke="white" strokeWidth="2.5" opacity="0.9" />
        <line x1="70" y1="0" x2="70" y2="100" stroke="white" strokeWidth="2.5" opacity="0.9" />
        <line x1="0" y1="85" x2="100" y2="85" stroke="white" strokeWidth="2" opacity="0.9" />
        <line x1="10" y1="0" x2="10" y2="100" stroke="white" strokeWidth="2" opacity="0.9" />
        <line x1="90" y1="0" x2="90" y2="100" stroke="white" strokeWidth="2" opacity="0.9" />

        {/* Trail */}
        <path d="M 15 80 Q 30 50, 45 45 T 65 30 T 85 12" fill="none" stroke="#0052FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      </svg>

      {/* GPS user marker */}
      <div className="absolute z-20" style={{ left: "15%", top: "80%", transform: "translate(-50%, -50%)" }}>
        <div className="relative w-[14px] h-[14px]">
          <span className="absolute inset-0 rounded-full bg-[#0052FF]/30 animate-ping scale-150 pointer-events-none" style={{ animationDuration: "2s" }} />
          <div className="w-[14px] h-[14px] rounded-full bg-[#0052FF] border-[2.5px] border-white shadow-[0_1px_6px_rgba(0,82,255,0.4)]" />
        </div>
      </div>

      {/* End dot */}
      <div className="absolute z-20" style={{ left: "85%", top: "12%", transform: "translate(-50%, -50%)" }}>
        <div className="w-2.5 h-2.5 rounded-full bg-black border-[2px] border-white shadow-[0_1px_4px_rgba(0,0,0,0.2)]" />
      </div>

      {/* Voice waypoint */}
      <div className="absolute z-20 cursor-pointer" style={{ left: "30%", top: "58%", transform: "translate(-50%, -50%)" }}>
        <div className="w-[18px] h-[18px] rounded-[5px] bg-black border-[1.5px] border-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] flex items-center justify-center">
          <svg className="w-[9px] h-[9px] text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Text waypoint */}
      <div className="absolute z-20 cursor-pointer" style={{ left: "50%", top: "42%", transform: "translate(-50%, -50%)" }}>
        <div className="w-[18px] h-[18px] rounded-[5px] bg-black border-[1.5px] border-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] flex items-center justify-center">
          <svg className="w-[9px] h-[9px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      </div>

      {/* Photo waypoint */}
      <div className="absolute z-20 cursor-pointer" style={{ left: "70%", top: "25%", transform: "translate(-50%, -50%)" }}>
        <div className="w-[18px] h-[18px] rounded-[5px] bg-black border-[1.5px] border-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] flex items-center justify-center">
          <svg className="w-[9px] h-[9px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
      </div>

      {/* Bottom card */}
      <div className="absolute left-[6%] right-[6%] bottom-[5%] bg-white/95 backdrop-blur-xl rounded-[12px] border border-black/[0.04] p-3 shadow-[0_-2px_20px_rgba(0,0,0,0.06)] z-20">
        <p className="text-[7px] font-semibold text-black/35 uppercase tracking-wide mb-0.5">
          Finding friends in a crowd
        </p>
        <p className="text-[11px] font-medium leading-snug text-black/80 tracking-tight">
          &ldquo;I&rsquo;m near the left speaker tower. Walk straight past the food stands.&rdquo;
        </p>
        <div className="mt-2 flex items-center gap-2">
          <button className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-3 h-3 fill-white ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <div className="flex-1 flex items-center gap-[1.5px] h-5 px-1">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="flex-1 bg-black/[0.08] rounded-full" style={{ height: `${25 + (i % 4) * 22}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScenarioPreview() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[260px]">
        {/* Phone bezel */}
        <div className="relative bg-black rounded-[36px] p-[3px] shadow-[0_20px_60px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.05)]">
          {/* Side buttons */}
          <div className="absolute left-[-3px] top-[70px] w-[3px] h-[24px] bg-[#3a3a3c] rounded-r-sm" />
          <div className="absolute left-[-3px] top-[100px] w-[3px] h-[24px] bg-[#3a3a3c] rounded-r-sm" />
          <div className="absolute right-[-3px] top-[80px] w-[3px] h-[32px] bg-[#3a3a3c] rounded-l-sm" />

          {/* Screen */}
          <div className="relative w-full aspect-[9/17] bg-[#f0f0f3] rounded-[32px] overflow-hidden">
            {/* Status bar */}
            <div className="absolute top-0 inset-x-0 h-[22px] flex items-center justify-between px-5 z-30 text-black/70 text-[10px] font-semibold tracking-tight">
              <span>9:41</span>
              <div className="flex items-center gap-[5px]">
                <svg className="w-[15px] h-[15px]" viewBox="0 0 20 20" fill="none">
                  <rect x="1" y="13" width="2.5" height="4" rx="0.5" fill="currentColor" opacity="0.3" />
                  <rect x="4.5" y="10" width="2.5" height="7" rx="0.5" fill="currentColor" opacity="0.3" />
                  <rect x="8" y="7" width="2.5" height="10" rx="0.5" fill="currentColor" opacity="0.6" />
                  <rect x="11.5" y="4" width="2.5" height="13" rx="0.5" fill="currentColor" />
                  <rect x="15" y="1" width="2" height="16" rx="0.5" fill="currentColor" />
                </svg>
                <svg className="w-[13px] h-[13px]" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2C6.5 2 4 5 4 8c0 4 6 10 6 10s6-6 6-10c0-3-2.5-6-6-6z" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="10" cy="8" r="2.5" fill="currentColor" />
                </svg>
                <div className="flex items-center">
                  <div className="w-[22px] h-[10px] rounded-[3px] border border-black/50 flex items-center justify-center relative">
                    <div className="h-[6px] bg-black/70 rounded-[1.5px]" style={{ width: `${Math.min(85, 100)}%`, marginRight: 'auto', marginLeft: '1.5px' }} />
                    <span className="absolute inset-0 flex items-center justify-center text-[6px] font-bold text-black/70">85</span>
                  </div>
                  <div className="w-[2px] h-[4px] rounded-r-[1px] bg-black/50 -ml-[0.5px]" />
                </div>
              </div>
            </div>

            {/* Dynamic Island */}
            <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-[60px] h-[16px] bg-black rounded-full z-30" />

            {/* Glass reflection */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none z-20" />

            <MapContent />
          </div>
        </div>

        {/* Bottom indicator bar */}
        <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-[80px] h-[3px] bg-black/10 rounded-full" />
      </div>

      <p className="text-xs font-medium text-black/35 mt-6 text-center max-w-xs leading-relaxed tracking-tight">
        Built for concerts, weddings, campuses, meetups,
        neighborhoods, and places where maps are not enough.
      </p>
    </div>
  );
}
