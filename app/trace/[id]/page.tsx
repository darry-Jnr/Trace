"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import SaveReviewModal from "@/components/trace/overlays/SaveReviewModal";

import { useGPSTracker } from "@/hooks/trace/useGPSTracker";
import { useMapEngine } from "@/hooks/trace/useMapEngine";
import { WaypointMedia } from "@/types";

import MapCanvas from "@/components/trace/MapCanvas";
import ControlDeck from "@/components/trace/ControlDeck";
import WaypointSheet from "@/components/trace/overlays/WaypointSheet";
import InitialLoader from "@/components/trace/overlays/InitialLoader";
import ReplayOverlay from "@/components/trace/overlays/ReplayOverlay";

import "mapbox-gl/dist/mapbox-gl.css";

export default function TraceWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
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
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [replayBaseLocation, setReplayBaseLocation] = useState<[number, number] | null>(null);
  const [traceDistance, setTraceDistance] = useState("0.0 mi");
  const [traceDate, setTraceDate] = useState("");

  // --- 1. LIFE CYCLE SYSTEM: READ LOCAL STORAGE VS GENERATE FRESH ---
  useEffect(() => {
    if (!id) return;
    
    async function loadTrace() {
      try {
        // 1. Try local storage first (instant client cache)
        const stored = localStorage.getItem("saved_traces");
        if (stored) {
          const traces = JSON.parse(stored);
          const savedTrace = traces.find((t: { id: string }) => t.id === id);

          if (savedTrace) {
            setIsReplayMode(true);
            setTraceTitleInput(savedTrace.title);
            if (savedTrace.coordinates && savedTrace.coordinates.length > 0) {
              setTrailCoordinates(savedTrace.coordinates);
              setReplayBaseLocation(savedTrace.coordinates[0]);
            }
            if (savedTrace.waypoints) {
              setSavedMedia(savedTrace.waypoints);
            }
            if (savedTrace.distance) {
              setTraceDistance(savedTrace.distance);
            }
            if (savedTrace.date) {
              setTraceDate(savedTrace.date);
            }
            setShowSaveReview(false);
            return;
          }
        }

        // 2. Not in local storage — try fetching from Supabase
        const res = await fetch(`/api/trace/${id}`);
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data) {
            const fetchedTrace = result.data;
            setIsReplayMode(true);
            setTraceTitleInput(fetchedTrace.title);
            if (fetchedTrace.coordinates && fetchedTrace.coordinates.length > 0) {
              setTrailCoordinates(fetchedTrace.coordinates);
              setReplayBaseLocation(fetchedTrace.coordinates[0]);
            }
            if (fetchedTrace.waypoints) {
              setSavedMedia(fetchedTrace.waypoints);
            }
            if (fetchedTrace.distance) {
              setTraceDistance(fetchedTrace.distance);
            }
            if (fetchedTrace.date) {
              setTraceDate(fetchedTrace.date);
            }
            setShowSaveReview(false);
            return;
          }
        }

        // 3. Brand new URL identifier link
        setIsReplayMode(false);
        setShowSaveReview(false);
        setTrailCoordinates([]);
        setSavedMedia([]);
        setTraceTitleInput("Fresh Location Trace");
      } catch (e) {
        console.error("Error evaluating trace context state:", e);
        // Fallback to fresh trace
        setIsReplayMode(false);
        setShowSaveReview(false);
        setTrailCoordinates([]);
        setSavedMedia([]);
        setTraceTitleInput("Fresh Location Trace");
      }
    }

    loadTrace();
  }, [id]);

  // Engine Connection #2: Hardware device telemetry location tracking engine
  // CRITICAL FIX: The GPS tracker is now allowed to run when idle to query the user's initial anchor dot frame
  const { baseLocation, userLocation, isLoading: gpsLoading, loadingStage } = useGPSTracker(
    !isReplayMode, // Keeps checking GPS to display your real dot context cleanly
    (coords: [number, number]) => {
      if (!isReplayMode && isRecording) {
        // eslint-disable-next-line react-hooks/immutability
        handleLocationStream(coords, null);
      }
    },
    (updatedPath: [number, number][]) => {
      if (!isReplayMode && isRecording) {
        setTrailCoordinates(updatedPath);
        // eslint-disable-next-line react-hooks/immutability
        updateVectorPath(updatedPath);
      }
    }
  );

  // Engine Connection #1: Mapbox canvas lifecycle engine
  const {
    viewMode,
    toggleViewPerspective,
    handleLocationStream,
    updateVectorPath,
    centerOnCoords
  } = useMapEngine(
    mapRef,
    isReplayMode ? replayBaseLocation : baseLocation,
    setActiveWaypoint,
    trailCoordinates,
    savedMedia
  );



  // Fallback fallback pointer coordinate interceptor
  const getCurrentCapturePoint = () => {
    return userLocation || baseLocation || trailCoordinates[trailCoordinates.length - 1] || [37.7749, -122.4194];
  };

  // --- INTERACTION INLINE DATA DISPATCHERS ---
  const handleSaveTextMarker = (text: string) => {
    const targetCoords = getCurrentCapturePoint();
    const newMedia: WaypointMedia = {
      id: `wp-${Date.now()}`,
      type: "text",
      content: text,
      category: "HELPING GUESTS FIND YOUR HOUSE",
      coordinates: targetCoords,
    };
    setSavedMedia((prev) => [...prev, newMedia]);
    setIsAddMenuOpen(false);
  };

  const handleSaveAudioMarker = (audioBlob: Blob, durationSec: number) => {
    const targetCoords = getCurrentCapturePoint();
    const newMedia: WaypointMedia = {
      id: `wp-${Date.now()}`,
      type: "voice",
      content: `Voice Memo (${durationSec}s)`,
      category: "FINDING FRIENDS IN A CROWD",
      coordinates: targetCoords,
    };
    setSavedMedia((prev) => [...prev, newMedia]);
    setIsAddMenuOpen(false);
  }; 

  const handleSavePhotoMarker = (imageDataUrl: string) => {
    const targetCoords = getCurrentCapturePoint();
    const newMedia: WaypointMedia = {
      id: `wp-${Date.now()}`,
      type: "image",
      content: imageDataUrl,
      category: "RUNNING WITH FRIENDS",
      coordinates: targetCoords,
    };
    setSavedMedia((prev) => [...prev, newMedia]);
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

  const handleCommitSaveTrace = async () => {
    setShowSaveReview(false);

    const dateString = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const newTrace = {
      id: id,
      title: traceTitleInput || "Unfinished Trail Trace",
      link: `${window.location.origin}/trace/${id}`,
      date: dateString,
      coordinates: trailCoordinates,
      waypoints: savedMedia,
      distance: trailCoordinates.length > 0 ? "0.2 mi" : "0.0 mi",
    };

    // 1. Save to Supabase database first
    try {
      const res = await fetch("/api/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTrace),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to persist to database");
      }
    } catch (err: any) {
      console.error("Error saving trace to Supabase:", err);
      toast.error("Database Save Failed", "Your trace could not be saved to server database. Saving locally instead.");
    }

    // 2. Save/register locally to trace ownership (needed for local dashboard)
    try {
      const stored = localStorage.getItem("saved_traces");
      const savedTraces = stored ? JSON.parse(stored) : [];
      const existingIndex = savedTraces.findIndex((t: { id: string }) => t.id === newTrace.id);
      if (existingIndex > -1) {
        savedTraces[existingIndex] = newTrace;
      } else {
        savedTraces.unshift(newTrace);
      }
      localStorage.setItem("saved_traces", JSON.stringify(savedTraces));
    } catch (e) {
      console.error("Error saving trace to localStorage:", e);
    }

    toast.success("Trace Saved Successfully", `"${traceTitleInput}" has been safely archived.`);
    router.push("/dashboard");
  };

  const handleCloseSaveReview = () => {
    setShowSaveReview(false);
  };

  const handleFollowRoute = () => {
    setIsReplayMode(false);
    setSavedMedia([]);
    setShowSaveReview(false);
    setIsRecording(true);
    setIsAddMenuOpen(false);
    toast.info("Following Route", "Recording a new path along this trace guide.");
  };

  // --- LOADER CONFIGURATION DIALS ---
  const loadingMessage = {
    booting: "Preparing workspace",
    searching: "Finding nearby position",
    improving: "Improving GPS accuracy",
    done: "Location connected",
  }[loadingStage];

  const showInitialLoader = isReplayMode ? !replayBaseLocation : gpsLoading;
  const loadingMessageStr = isReplayMode ? "Loading saved trace..." : loadingMessage;

  return (
    <div className="relative flex w-screen h-screen overflow-hidden bg-[#f5f5f7] font-sans selection:bg-black selection:text-white">
      <div className="relative flex-1 h-full min-w-0 transition-all duration-300 z-0 [&_.mapboxgl-ctrl-logo]:hidden [&_.mapboxgl-ctrl-attrib]:hidden">

        {/* BACKDROP INTERACTIVE CANVAS ENGINE */}
        <MapCanvas mapRef={mapRef} onClearActive={() => setActiveWaypoint(null)} />

        {/* SIDE DRAWER MARKER NODE SHEETS */}
        <WaypointSheet activeWaypoint={activeWaypoint} onClose={() => setActiveWaypoint(null)} />

        {/* REPLAY PANEL: shown when viewing a saved trace */}
        {isReplayMode && (
          <ReplayOverlay
            title={traceTitleInput}
            date={traceDate}
            distance={traceDistance}
            waypoints={savedMedia}
            onBack={() => router.push("/dashboard")}
            onFollow={handleFollowRoute}
            onWaypointSelect={(wp) => {
              centerOnCoords(wp.coordinates);
              setActiveWaypoint(wp);
            }}
            activeWaypointId={activeWaypoint?.id}
          />
        )}

        {/* INPUT HARDWARE CONTROL DECK CORE PANEL */}
        {!showInitialLoader && !isReplayMode && (
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

      {/* POST-RECORDING SAVE REVIEW MODAL */}
      {!isReplayMode && (
        <SaveReviewModal
          isOpen={showSaveReview}
          onClose={handleCloseSaveReview}
          title={traceTitleInput}
          onTitleChange={setTraceTitleInput}
          waypointCount={savedMedia.length}
          distance={trailCoordinates.length > 0 ? "0.2 mi" : "0.0 mi"}
          onSave={handleCommitSaveTrace}
          points={trailCoordinates}
        />
      )}

      {/* BLOCKING HARDWARE LOADING TIMELINE MASK */}
      <InitialLoader isLoading={showInitialLoader} loadingMessage={loadingMessageStr} />
    </div>
  );
}