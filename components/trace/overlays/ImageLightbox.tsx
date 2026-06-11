"use client";

import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const offsetY = useRef(0);
  const isDragging = useRef(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target !== overlayRef.current) return;
    startY.current = e.clientY;
    isDragging.current = true;
    overlayRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !overlayRef.current) return;
    offsetY.current = e.clientY - startY.current;
    if (offsetY.current > 0) {
      overlayRef.current.style.transform = `translateY(${offsetY.current}px)`;
      overlayRef.current.style.opacity = `${1 - offsetY.current / 300}`;
    }
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (offsetY.current > 120) {
      onClose();
    } else if (overlayRef.current) {
      overlayRef.current.style.transform = "";
      overlayRef.current.style.opacity = "";
    }
    offsetY.current = 0;
  };

  return (
    <div
      ref={overlayRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 touch-pan-y cursor-pointer"
      style={{ transition: isDragging.current ? "none" : "transform 0.3s ease, opacity 0.3s ease" }}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-90 transition cursor-pointer"
      >
        <X className="w-4 h-4 text-white" />
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Fullscreen"
        className="max-w-full max-h-full w-full h-full object-contain p-4 md:p-8 select-none pointer-events-none"
        draggable={false}
      />
    </div>
  );
}
