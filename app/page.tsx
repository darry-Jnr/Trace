import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import StartTraceButton from "@/components/landing/StartTraceButton";
import ScenarioPreview from "@/components/landing/ScenarioPreview";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-black flex flex-col selection:bg-black selection:text-white">
      <Navbar />

      <main className="flex-1">
        <section className="px-6 md:px-10 pt-12 md:pt-24 pb-12 md:pb-20">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-24 items-center">

            <div className="max-w-xl">
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-semibold tracking-[-0.05em] leading-[0.95] text-black/90">
                Show people exactly where to go.
              </h1>

              <p className="mt-4 md:mt-7 text-base md:text-lg text-black/50 font-medium leading-relaxed tracking-tight">
                Walk the route once, leave photos, notes, or voice messages
                along the way, and share a single link. Friends follow your
                exact path and see everything at the right moments.
              </p>

              <StartTraceButton />
            </div>

            <div className="flex flex-col items-center">
              <ScenarioPreview />
            </div>
          </div>
        </section>

        <section className="px-6 pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl mx-auto grid sm:grid-cols-3 gap-10 sm:gap-12">
              <div className="flex flex-row sm:flex-col items-start sm:items-center gap-4 sm:gap-0 text-left sm:text-center">
                <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-black/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 16.5c0-2.5 1.5-5 4-5 2.5 0 4 2.5 4 5" />
                    <path d="M12 16.5c0-2.5 1.5-5 4-5 2.5 0 4 2.5 4 5" />
                    <path d="M4 12.5c0-2 1-4 3-4 2 0 3 2 3 4" />
                    <path d="M10 12.5c0-2 1-4 3-4 2 0 3 2 3 4" />
                    <path d="M7 20c0-1.5.7-3 2-3 1.3 0 2 1.5 2 3" />
                    <path d="M13 20c0-1.5.7-3 2-3 1.3 0 2 1.5 2 3" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight text-[15px]">Walk the route</h3>
                  <p className="mt-0.5 sm:mt-1.5 text-sm font-medium text-black/45 leading-normal tracking-tight max-w-[200px]">
                    Trace records your exact path as you move.
                  </p>
                </div>
              </div>

              <div className="flex flex-row sm:flex-col items-start sm:items-center gap-4 sm:gap-0 text-left sm:text-center">
                <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-black/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight text-[15px]">Add moments along the way</h3>
                  <p className="mt-0.5 sm:mt-1.5 text-sm font-medium text-black/45 leading-normal tracking-tight max-w-[200px]">
                    Leave photos, notes, or voice messages anywhere on the route.
                  </p>
                </div>
              </div>

              <div className="flex flex-row sm:flex-col items-start sm:items-center gap-4 sm:gap-0 text-left sm:text-center">
                <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-black/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight text-[15px]">Share one link</h3>
                  <p className="mt-0.5 sm:mt-1.5 text-sm font-medium text-black/45 leading-normal tracking-tight max-w-[200px]">
                    Friends follow your route instantly from their phone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
