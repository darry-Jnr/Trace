import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import StartTraceButton from "@/components/landing/StartTraceButton";
import ScenarioPreview from "@/components/landing/ScenarioPreview";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-black flex flex-col selection:bg-black selection:text-white">
      <Navbar />

      <main className="flex-1 overflow-hidden">
        <section className="px-6 md:px-10 pt-12 md:pt-24 pb-24">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-24 items-center">

            <div className="max-w-xl">
              <p className="text-sm font-medium text-black/40 mb-5 tracking-tight">
                Maps show roads. People show the way.
              </p>

              <h1 className="text-5xl md:text-7xl font-semibold tracking-[-0.05em] leading-[0.95]">
                Show people exactly where to go.
              </h1>

              <p className="mt-5 lg:mt-7 text-base lg:text-lg text-black/60 font-medium leading-relaxed tracking-tight">
                Walk the route once, leave photos, notes, or voice messages
                along the way, and share a single link. Friends follow your
                exact path and see everything at the right moments.
              </p>

              <StartTraceButton />

              <div className="mt-10 lg:mt-20 space-y-6 lg:space-y-8 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-[1px] before:bg-black/[0.06]">
                <div className="flex gap-5 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold tracking-tight text-[15px]">Walk the route</h3>
                    <p className="text-sm font-medium text-black/45 mt-1 leading-normal tracking-tight">
                      Trace records your exact path as you move.
                    </p>
                  </div>
                </div>

                <div className="flex gap-5 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold tracking-tight text-[15px]">Add moments along the way</h3>
                    <p className="text-sm font-medium text-black/45 mt-1 leading-normal tracking-tight">
                      Leave photos, notes, or voice messages anywhere on the route.
                    </p>
                  </div>
                </div>

                <div className="flex gap-5 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold tracking-tight text-[15px]">Share one link</h3>
                    <p className="text-sm font-medium text-black/45 mt-1 leading-normal tracking-tight">
                      Friends follow your route instantly from their phone.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <ScenarioPreview />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
