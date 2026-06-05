"use client";

interface InitialLoaderProps {
  isLoading: boolean;
  loadingMessage: string;
}

export default function InitialLoader({
  isLoading,
  loadingMessage,
}: InitialLoaderProps) {

  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-[#f5f5f7] flex items-center justify-center select-none">

      {/* Soft Background Glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[650px] h-[650px] rounded-full bg-[#dfe9ff] blur-3xl opacity-70" />
      </div>

      {/* Main Content */}
      <div className="relative flex flex-col items-center">

        {/* Loader Orb */}
        <div className="relative flex items-center justify-center">

          {/* Pulse Rings */}
          <div className="absolute w-28 h-28 rounded-full border border-[#0052FF]/10 animate-ping" />

          <div className="absolute w-20 h-20 rounded-full border border-[#0052FF]/10" />

          {/* Glass Card */}
          <div className="relative w-16 h-16 rounded-[22px] bg-white/80 backdrop-blur-2xl border border-white shadow-[0_10px_40px_rgba(0,82,255,0.10)] flex items-center justify-center">

            {/* Light Gradient */}
            <div className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-[#0052FF]/10 via-transparent to-transparent" />

            {/* Trace Logo */}
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7 text-black animate-[pulse_2.5s_ease-in-out_infinite]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle
                cx="6"
                cy="18"
                r="1.5"
                className="fill-current"
              />

              <path d="M6 18C6 12 18 12 18 6" />

              <circle
                cx="18"
                cy="6"
                r="1.5"
                className="fill-current"
              />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="mt-8 text-center">

          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-black">
            {loadingMessage}
          </h2>

          <p className="mt-1 text-[12px] font-medium tracking-tight text-black/35">
            Preparing your trace
          </p>

        </div>
      </div>
    </div>
  );
}