"use client";

export default function Footer() {
  return (
    <footer className="border-t border-black/5 py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-black text-white flex items-center justify-center text-xs font-medium">
            T
          </div>

          <div>
            <p className="text-sm font-medium tracking-tight">
              Trace
            </p>

            <p className="text-xs text-black/40">
              © {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {/* Right */}
        <p className="text-xs sm:text-sm text-black/40 text-center sm:text-right leading-relaxed">
          Share routes with voice, photos, and notes.
        </p>
      </div>
    </footer>
  );
}