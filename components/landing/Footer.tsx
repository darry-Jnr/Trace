export default function Footer() {
  return (
    <footer className="border-t border-black/[0.04] bg-[#f5f5f7]/40 py-8 px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-black flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="18" r="1.5" className="fill-white" />
              <path d="M6 18C6 12 18 12 18 6" />
              <circle cx="18" cy="6" r="1.5" className="fill-white" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold tracking-[-0.01em] text-black">Trace</span>
          <span className="text-[11px] font-medium text-black/25">© {new Date().getFullYear()}</span>
        </div>

        <div className="text-[11px] font-medium text-black/30 tracking-tight flex items-center gap-1">
          Built with
          <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          and lots of route puns
        </div>

      </div>
    </footer>
  );
}
