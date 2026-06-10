export default function Footer() {
  return (
    <footer className="border-t border-black/[0.04] bg-[#f5f5f7]/40 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">

        {/* Left Section (Brand & Copy) */}
        <div className="flex items-center gap-3">
          {/* Custom Squircle Icon Frame (Footer Scale) */}
          <div className="w-8 h-8 rounded-[10px] bg-black flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            {/* Custom Dynamic Route Path SVG */}
            <svg 
              viewBox="0 0 24 24" 
              className="w-4 h-4 text-white"
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="6" cy="18" r="1.5" className="fill-white" />
              <path d="M6 18C6 12 18 12 18 6" />
              <circle cx="18" cy="6" r="1.5" className="fill-white" />
            </svg>
          </div>

          <div className="leading-tight">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-black">
              Trace
            </p>
            <p className="text-[11px] font-medium text-black/35 mt-0.5">
              © {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {/* Right Section (Tagline) */}
        <p className="text-xs font-medium tracking-tight text-black/40 text-center sm:text-right leading-relaxed max-w-xs">
          Share routes seamlessly with voice recordings, photos, and context notes.
        </p>
        
      </div>
    </footer>
  );
}