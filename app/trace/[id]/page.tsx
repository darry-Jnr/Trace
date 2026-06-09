"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import SaveReviewModal from "@/components/trace/overlays/SaveReviewModal";

import { useGPSTracker } from "@/hooks/trace/useGPSTracker";
import { useReplayGuidance } from "@/hooks/trace/useReplayGuidance";
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

  const [isSaving, setIsSaving] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<string>("");
  const [showStartHint, setShowStartHint] = useState(false);
  const [gpsTimedOut, setGpsTimedOut] = useState(false);
  const gpsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDistanceMeters = (coord1: [number, number], coord2: [number, number]) => {
    const R = 6371000;
    const dLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
    const dLng = ((coord2[0] - coord1[0]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1[1] * Math.PI) / 180) *
      Math.cos((coord2[1] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (coords: [number, number][]) => {
    if (coords.length < 2) return "0.0 mi";
    let totalMeters = 0;
    for (let i = 1; i < coords.length; i++) {
      totalMeters += getDistanceMeters(coords[i - 1], coords[i]);
    }
    const miles = totalMeters / 1609.344;
    return `${miles.toFixed(1)} mi`;
  };

  // Pending media uploads keyed by waypoint id
  // voice -> Blob, image -> data URL string
  const pendingMediaRef = useRef<Map<string, Blob | string>>(new Map());

  // Recalculate distance when trail changes
  useEffect(() => {
    setTraceDistance(formatDistance(trailCoordinates));
  }, [trailCoordinates]);

  // Warn user before leaving with unsaved media
  useEffect(() => {
    if (isReplayMode) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingMediaRef.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isReplayMode]);

  const uploadFile = useCallback(async (
    file: File,
    traceId: string,
    waypointId: string
  ): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("traceId", traceId);
    formData.append("waypointId", waypointId);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url || null;
    } catch {
      return null;
    }
  }, []);

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
            savedTrailCoordinatesRef.current = savedTrace.coordinates || [];
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
            savedTrailCoordinatesRef.current = fetchedTrace.coordinates || [];
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
            (window as any).pendo?.track('Trace Opened', { traceId: id, source: 'shared_link' });
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
  const { baseLocation, userLocation, isLoading: gpsLoading, loadingStage, hasGpsFix, retryGps } = useGPSTracker(
    isRecording,
    (coords: [number, number], heading: number | null) => {
      // eslint-disable-next-line react-hooks/immutability
      handleLocationStream(coords, heading);
    },
    (updatedPath: [number, number][]) => {
      if (isRecording) {
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
    updateGhostPath,
    setTiltedView,
    centerOnCoords
  } = useMapEngine(
    mapRef,
    isReplayMode ? replayBaseLocation : baseLocation,
    setActiveWaypoint,
    trailCoordinates,
    savedMedia
  );

  // Replay guidance — drives the discovery experience
  const savedTrailCoordinatesRef = useRef<[number, number][]>([]);
  const {
    isNearStart,
    hasStarted,
    isOffRoute,
    offRouteDistance,
    distanceToStart,
    trailProgress,
    activeWaypoint: guidanceWaypoint,
    startGuidance,
    dismissWaypoint,
  } = useReplayGuidance({
    trailCoordinates: savedTrailCoordinatesRef.current,
    waypoints: savedMedia,
    userLocation,
    isReplayMode,
  });



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
    (window as any).pendo?.track('Moment Added', { type: 'text', traceId: id });
  };

  const handleSaveAudioMarker = (audioBlob: Blob, durationSec: number) => {
    const targetCoords = getCurrentCapturePoint();
    const wpId = `wp-${Date.now()}`;
    pendingMediaRef.current.set(wpId, audioBlob);
    const newMedia: WaypointMedia = {
      id: wpId,
      type: "voice",
      content: `Voice Memo (${durationSec}s)`,
      category: "FINDING FRIENDS IN A CROWD",
      coordinates: targetCoords,
    };
    setSavedMedia((prev) => [...prev, newMedia]);
    setIsAddMenuOpen(false);
    (window as any).pendo?.track('Moment Added', { type: 'voice', duration: durationSec, traceId: id });
  };

  const handleSavePhotoMarker = (imageDataUrl: string) => {
    const targetCoords = getCurrentCapturePoint();
    const wpId = `wp-${Date.now()}`;
    pendingMediaRef.current.set(wpId, imageDataUrl);
    const newMedia: WaypointMedia = {
      id: wpId,
      type: "image",
      content: imageDataUrl,
      category: "RUNNING WITH FRIENDS",
      coordinates: targetCoords,
    };
    setSavedMedia((prev) => [...prev, newMedia]);
    setIsAddMenuOpen(false);
    (window as any).pendo?.track('Moment Added', { type: 'image', traceId: id });
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setShowSaveReview(true);
    } else {
      setIsRecording(true);
      setIsAddMenuOpen(false);
      setRecordingStartedAt(new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }));
    }
  };

  const handleCommitSaveTrace = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setShowSaveReview(false);

    try {
      // 1. Upload any pending media files to Supabase Storage
      const uploadPromises: Promise<void>[] = [];
      for (const wp of savedMedia) {
      const pendingData = pendingMediaRef.current.get(wp.id);
      if (!pendingData) continue;

      if (wp.type === "voice") {
        const blob = pendingData as Blob;
        const file = new File([blob], `voice-${wp.id}.webm`, { type: "audio/webm" });
        uploadPromises.push(
          uploadFile(file, id, wp.id).then((url) => {
            if (url) {
              setSavedMedia((prev) => prev.map((m) => m.id === wp.id ? { ...m, fileUrl: url } : m));
            }
          })
        );
      } else if (wp.type === "image") {
        uploadPromises.push(
          (async () => {
            try {
              const dataUrl = pendingData as string;
              const res = await fetch(dataUrl);
              const blob = await res.blob();
              const file = new File([blob], `photo-${wp.id}.jpg`, { type: "image/jpeg" });
              const url = await uploadFile(file, id, wp.id);
              if (url) {
                setSavedMedia((prev) => prev.map((m) => m.id === wp.id ? { ...m, fileUrl: url } : m));
              }
            } catch (e) {
              console.error("Failed to upload image for waypoint", wp.id, e);
            }
          })()
        );
      }
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);
    pendingMediaRef.current.clear();

    const dateString = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const newTrace = {
      id: id,
      title: traceTitleInput || "Unfinished Trail Trace",
      link: `${window.location.origin}/trace/${id}`,
      date: dateString,
      coordinates: trailCoordinates,
      waypoints: savedMedia,
      distance: traceDistance,
    };

    // 2. Save to Supabase database
    try {
      const res = await fetch("/api/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTrace),
  });

  // Replay guidance — drives the discovery experience
  const savedTrailCoordinatesRef = useRef<[number, number][]>([]);
  const {
    isNearStart,
    hasStarted,
    isOffRoute,
    offRouteDistance,
    distanceToStart,
    trailProgress,
    activeWaypoint: guidanceWaypoint,
    startGuidance,
    dismissWaypoint,
  } = useReplayGuidance({
    trailCoordinates: savedTrailCoordinatesRef.current,
    waypoints: savedMedia,
    userLocation,
    isReplayMode,
  });

  // Show full trail as ghost in replay mode (dimmed), hide during recording
  useEffect(() => {
    if (isReplayMode && savedTrailCoordinatesRef.current.length > 0) {
      updateGhostPath(savedTrailCoordinatesRef.current);
      setTiltedView(true);
    } else {
      updateGhostPath([]);
    }
  }, [isReplayMode]);

  // Update active trail in replay mode — only show revealed portion
  useEffect(() => {
    if (!isReplayMode || !hasStarted || savedTrailCoordinatesRef.current.length === 0) {
      if (isReplayMode && savedTrailCoordinatesRef.current.length > 0) {
        updateVectorPath(savedTrailCoordinatesRef.current);
      }
      return;
    }
    const fullTrail = savedTrailCoordinatesRef.current;
    const revealIndex = Math.floor(trailProgress * fullTrail.length);
    const revealed = fullTrail.slice(0, Math.min(revealIndex + 5, fullTrail.length));
    updateVectorPath(revealed);
  }, [isReplayMode, hasStarted, trailProgress]);

  // Update ghost trail in replay to hide already-revealed portion
  useEffect(() => {
    if (!isReplayMode || !hasStarted || savedTrailCoordinatesRef.current.length === 0) return;
    const fullTrail = savedTrailCoordinatesRef.current;
    const revealIndex = Math.floor(trailProgress * fullTrail.length);
    const remaining = fullTrail.slice(revealIndex);
    updateGhostPath(remaining);
  }, [isReplayMode, hasStarted, trailProgress]);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to persist to database");
      }
      (window as any).pendo?.track('Trace Saved', { traceId: id, title: traceTitleInput, waypointCount: savedMedia.length, distance: traceDistance });
    } catch (err: any) {
      console.error("Error saving trace to Supabase:", err);
      toast.error("Database Save Failed", "Your trace could not be saved to server database. Saving locally instead.");
    }

    // 3. Save/register locally to trace ownership (needed for local dashboard)
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseSaveReview = () => {
    setShowSaveReview(false);
  };

  // --- LOADER CONFIGURATION DIALS ---
  const loadingMessage = {
    booting: "Preparing workspace",
    searching: "Finding nearby position",
    improving: "Improving GPS accuracy",
    done: "Location connected",
  }[loadingStage];

  const showInitialLoader = isReplayMode
    ? !replayBaseLocation
    : (gpsLoading || (!hasGpsFix && !gpsTimedOut));
  const loadingMessageStr = isReplayMode
    ? "Loading saved trace..."
    : (gpsTimedOut ? "Could not find location" : loadingMessage);

  // Onboarding hint logic
  useEffect(() => {
    if (!showInitialLoader && !isReplayMode && !isRecording) {
      const timer = setTimeout(() => setShowStartHint(true), 800);
      return () => clearTimeout(timer);
    }
    setShowStartHint(false);
  }, [showInitialLoader, isReplayMode, isRecording]);

  useEffect(() => {
    if (!showStartHint) return;
    const timer = setTimeout(() => setShowStartHint(false), 6000);
    return () => clearTimeout(timer);
  }, [showStartHint]);

  useEffect(() => {
    if (isRecording) setShowStartHint(false);
  }, [isRecording]);

  return (
    <div className="relative flex w-screen h-screen overflow-hidden bg-[#f5f5f7] font-sans selection:bg-black selection:text-white">
      <div className="relative flex-1 h-full min-w-0 transition-all duration-300 z-0 [&_.mapboxgl-ctrl-logo]:hidden [&_.mapboxgl-ctrl-attrib]:hidden">

        {/* BACKDROP INTERACTIVE CANVAS ENGINE */}
        <MapCanvas mapRef={mapRef} onClearActive={() => setActiveWaypoint(null)} />

        {/* SIDE DRAWER MARKER NODE SHEETS */}
        <WaypointSheet activeWaypoint={activeWaypoint} onClose={() => setActiveWaypoint(null)} />

        {/* REPLAY PANEL: guided discovery for saved traces */}
        {isReplayMode && (
          <ReplayOverlay
            title={traceTitleInput}
            date={traceDate}
            distance={traceDistance}
            waypoints={savedMedia}
            onBack={() => router.push("/dashboard")}
            isGuidedMode={true}
            hasStarted={hasStarted}
            isNearStart={isNearStart}
            isOffRoute={isOffRoute}
            offRouteDistance={offRouteDistance}
            distanceToStart={distanceToStart}
            trailProgress={trailProgress}
            activeWaypoint={guidanceWaypoint}
            onStartGuidance={() => {
              startGuidance();
              setTiltedView(true);
            }}
            onDismissWaypoint={dismissWaypoint}
          />
        )}

        {/* INPUT HARDWARE CONTROL DECK CORE PANEL */}
        {!showInitialLoader && !isReplayMode && (
          <>
            {/* Top-left button group */}
            {!isRecording && (
              <div className="absolute top-5 left-5 z-40 flex items-center gap-2">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-2xl border border-black/[0.05] shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-90 transition-all duration-200 hover:bg-white group"
                  title="Back to dashboard"
                >
                  <svg className="w-4 h-4 text-black/60 group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  onClick={() => userLocation && centerOnCoords(userLocation)}
                  className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-2xl border border-black/[0.05] shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-90 transition-all duration-200 hover:bg-white group"
                  title="Re-center on my location"
                >
                  <svg className="w-4 h-4 text-black/60 group-hover:text-black transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                  </svg>
                </button>
              </div>
            )}

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

            {/* Location status banner — visible until GPS locks */}
            {!hasGpsFix && !gpsTimedOut && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
                <div className="px-4 py-2 rounded-full bg-white/80 backdrop-blur-2xl border border-black/[0.05] shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-2.5">
                  <span className="relative flex w-2 h-2">
                    <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-[#0052FF] opacity-75" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-[#0052FF]" />
                  </span>
                  <span className="text-[12px] font-medium text-black/60 tracking-tight">Finding your location...</span>
                </div>
              </div>
            )}
            {gpsTimedOut && !hasGpsFix && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
                <div className="px-4 py-2 rounded-full bg-white/80 backdrop-blur-2xl border border-black/[0.05] shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-2.5">
                  <span className="text-[12px] font-medium text-black/40 tracking-tight">Location unavailable</span>
                  <button
                    onClick={retryGps}
                    className="text-[12px] font-semibold text-[#0052FF] hover:text-black transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Onboarding hint — points at the Start button */}
            {showStartHint && !isRecording && (
              <div className="absolute right-[72px] top-1/2 -translate-y-1/2 z-40 pointer-events-none animate-fade-in">
                <div className="relative px-4 py-2.5 rounded-2xl bg-black text-white text-xs font-medium tracking-tight shadow-lg whitespace-nowrap">
                  <span>Tap Start to begin tracing your route</span>
                  <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-black rotate-45" />
                </div>
              </div>
            )}
          </>
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
          distance={traceDistance}
          onSave={handleCommitSaveTrace}
          points={trailCoordinates}
          isSaving={isSaving}
          createdAt={recordingStartedAt}
        />
      )}

      {/* BLOCKING HARDWARE LOADING TIMELINE MASK */}
      <InitialLoader isLoading={showInitialLoader} loadingMessage={loadingMessageStr} onRetry={gpsTimedOut ? retryGps : undefined} />
    </div>
  );
}