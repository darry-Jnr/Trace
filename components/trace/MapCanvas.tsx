"use client";

interface MapCanvasProps {
  mapRef: React.RefObject<HTMLDivElement | null>;
  onClearActive: () => void;
}

export default function MapCanvas({ mapRef, onClearActive }: MapCanvasProps) {
  return (
    <div 
      ref={mapRef} 
      className="w-full h-full" 
      onClick={onClearActive} 
    />
  );
}
