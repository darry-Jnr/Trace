"use client";

import { useState, useEffect } from "react";

interface NameModalProps {
  isOpen: boolean;
  onComplete: (name: string) => void;
  title?: string;
}

function generateGuestName(): string {
  const suffix = Math.random().toString(36).substring(2, 6);
  return `Guest_${suffix}`;
}

export default function NameModal({
  isOpen,
  onComplete,
  title = "What should we call you?",
}: NameModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem("visitor_name");
      if (stored) {
        onComplete(stored);
      }
    }
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  const handleContinue = () => {
    const finalName = name.trim() || generateGuestName();
    localStorage.setItem("visitor_name", finalName);
    (window as any).pendo?.track('Visitor Name Set', { nameProvided: !!name.trim(), wasSkipped: false });
    onComplete(finalName);
  };

  const handleSkip = () => {
    const guestName = generateGuestName();
    localStorage.setItem("visitor_name", guestName);
    (window as any).pendo?.track('Visitor Name Set', { nameProvided: false, wasSkipped: true });
    onComplete(guestName);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="mx-4 p-6 rounded-[28px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col max-w-[340px] w-full">
        <h2 className="text-[22px] font-bold tracking-tight text-black text-center">
          {title}
        </h2>
        <p className="mt-1.5 text-[13px] text-black/50 font-medium text-center leading-relaxed">
          Your name will be shown on your comments.
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={30}
          autoFocus
          className="mt-5 w-full h-12 px-4 rounded-2xl bg-[#f5f5f7] border border-transparent focus:border-black/10 focus:bg-white outline-none transition text-[15px] font-medium tracking-tight placeholder:text-black/25"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleContinue();
          }}
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSkip}
            className="flex-1 h-11 rounded-2xl bg-[#f5f5f7] text-[13px] font-semibold text-black/50 active:scale-[0.98] transition-transform"
          >
            Skip
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 h-11 rounded-2xl bg-black text-white text-[13px] font-semibold active:scale-[0.98] transition-transform"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
