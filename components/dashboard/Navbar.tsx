import Link from "next/link";

const Navbar = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#f5f5f7]/80 backdrop-blur-xl border-b border-black/[0.04]">

      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-[11px] bg-black flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-transform duration-200 group-hover:scale-[1.02] active:scale-[0.98]">
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-white" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="18" r="1.5" className="fill-white" />
              <path d="M6 18C6 12 18 12 18 6" />
              <circle cx="18" cy="6" r="1.5" className="fill-white" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-black">
            Trace
          </span>
        </Link>

        <div />

      </div>
    </header>
  );
};

export default Navbar;