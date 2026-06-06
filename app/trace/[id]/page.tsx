"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import SaveReviewModal from "@/components/trace/SaveReviewModal";

import { useGPSTracker } from "@/hooks/useGPSTracker";
import { useMapEngine } from "@/hooks/useMapEngine";
import { WaypointMedia } from "@/types";

import MapCanvas from "@/components/trace/MapCanvas";
import ControlDeck from "@/components/trace/ControlDeck";
import WaypointSheet from "@/components/trace/WaypointSheet";
import InitialLoader from "@/components/trace/InitialLoader";

import "mapbox-gl/dist/mapbox-gl.css";

export default function TraceWorkspacePage() {
  const router = useRouter();
  const toast = useToast();
  const mapRef = useRef<HTMLDivElement>(null);

  // Core UI Action Layout States
  const [isRecording, setIsRecording] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [savedMedia, setSavedMedia] = useState<WaypointMedia[]>([]);
  const [activeWaypoint, setActiveWaypoint] = useState<WaypointMedia | null>(null);
  const [showSaveReview, setShowSaveReview] = useState(false);
  const [traceTitleInput, setTraceTitleInput] = useState("Unfinished Trail Trace");
  const [trailCoordinates, setTrailCoordinates] = useState<[number, number][]>([]);

  // Engine Connection #2: Hardware device telemetry location tracking engine
  // Note: handleLocationStream / updateVectorPath are used in these callbacks before their textual declaration.
  // This is safe because useGPSTracker stores callbacks in stable refs and only invokes them from async GPS
  // watchPosition callbacks — never synchronously during render.
  const { baseLocation, userLocation, isLoading, loadingStage } = useGPSTracker(
    isRecording,
    // eslint-disable-next-line react-hooks/immutability
    (coords: [number, number]) => handleLocationStream(coords, null),
    (updatedPath: [number, number][]) => {
      setTrailCoordinates(updatedPath);
      // eslint-disable-next-line react-hooks/immutability
      updateVectorPath(updatedPath);
    }
  );

  // Engine Connection #1: Mapbox canvas lifecycle engine
  const { 
    viewMode, 
    toggleViewPerspective, 
    handleLocationStream, 
    updateVectorPath, 
    injectDOMMarker 
  } = useMapEngine(mapRef, baseLocation, setActiveWaypoint);

  const handleSaveTextMarker = (text: string) => {
    if (!userLocation) return;
    const newMedia: WaypointMedia = {
      id: `wp-${Date.now()}`,
      type: "text",
      content: text,
      category: "HELPING GUESTS FIND YOUR HOUSE",
      coordinates: userLocation,
    };
    setSavedMedia((prev) => [...prev, newMedia]);
    injectDOMMarker(newMedia);
    setIsAddMenuOpen(false);
  };

  const handleSaveAudioMarker = (audioBlob: Blob, durationSec: number) => {
    if (!userLocation) return;
    const newMedia: WaypointMedia = {
      id: `wp-${Date.now()}`,
      type: "voice",
      content: `Voice Memo (${durationSec}s)`,
      category: "FINDING FRIENDS IN A CROWD",
      coordinates: userLocation,
    };
    setSavedMedia((prev) => [...prev, newMedia]);
    injectDOMMarker(newMedia);
    setIsAddMenuOpen(false);
  };

  const handleSavePhotoMarker = (imageDataUrl: string) => {
    if (!userLocation) return;
    const newMedia: WaypointMedia = {
      id: `wp-${Date.now()}`,
      type: "image",
      content: imageDataUrl,
      category: "RUNNING WITH FRIENDS",
      coordinates: userLocation,
    };
    setSavedMedia((prev) => [...prev, newMedia]);
    injectDOMMarker(newMedia);
    setIsAddMenuOpen(false);
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setShowSaveReview(true);
    } else {
      setIsRecording(true);
      setIsAddMenuOpen(false);
    }
  };

  const handleCommitSaveTrace = () => {
    setShowSaveReview(false);
    toast.success("Trace Saved Successfully", `"${traceTitleInput}" has been safely archived.`);
    router.push("/dashboard");
  };

  const loadingMessage = {
    booting: "Preparing workspace",
    searching: "Finding nearby position",
    improving: "Improving GPS accuracy",
    done: "Location connected",
  }[loadingStage];

  return (
    <div className="relative flex w-screen h-screen overflow-hidden bg-[#f5f5f7] font-sans selection:bg-black selection:text-white">
      <div className="relative flex-1 h-full min-w-0 transition-all duration-300 z-0 [&_.mapboxgl-ctrl-logo]:hidden [&_.mapboxgl-ctrl-attrib]:hidden">
        
        <MapCanvas mapRef={mapRef} onClearActive={() => setActiveWaypoint(null)} />
        
        <WaypointSheet activeWaypoint={activeWaypoint} onClose={() => setActiveWaypoint(null)} />

        {!isLoading && userLocation && (
          <ControlDeck
            viewMode={viewMode}
            isRecording={isRecording}
            isAddMenuOpen={isAddMenuOpen}
            onToggleView={toggleViewPerspective}
            onToggleRecord={handleToggleRecord}
            onToggleAddMenu={() => setIsAddMenuOpen(!isAddMenuOpen)}
            onSendText={handleSaveTextMarker}
            onAudioRecorded={handleSaveAudioMarker}
            onPhotoCaptured={handleSavePhotoMarker}
          />
        )}
      </div>

      <SaveReviewModal
        isOpen={showSaveReview}
        onClose={() => setShowSaveReview(false)}
        title={traceTitleInput}
        onTitleChange={setTraceTitleInput}
        waypointCount={savedMedia.length}
        distance={trailCoordinates.length > 0 ? "0.2 mi" : "0.0 mi"}
        onSave={handleCommitSaveTrace}
        points={trailCoordinates}
      />

      <InitialLoader isLoading={isLoading} loadingMessage={loadingMessage} />
    </div>
  );
}
