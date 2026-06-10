"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useToast } from "@/components/ui/Toast";

import { useGPSTracker } from "@/hooks/trace/useGPSTracker";
import { useMapEngine } from "@/hooks/trace/useMapEngine";
import { useReplayGuidance } from "@/hooks/trace/useReplayGuidance";
import { WaypointMedia } from "@/types";

import MapCanvas from "@/components/trace/MapCanvas";
import ControlDeck from "@/components/trace/ControlDeck";
import WaypointSheet from "@/components/trace/overlays/WaypointSheet";
import InitialLoader from "@/components/trace/overlays/InitialLoader";
import ReplayOverlay from "@/components/trace/overlays/ReplayOverlay";
import NameModal from "@/components/trace/NameModal";
import RecordingTimer from "@/components/trace/RecordingTimer";
import LocationStatus from "@/components/trace/LocationStatus";

const SaveReviewModal = dynamic(
  () => import("@/components/trace/overlays/SaveReviewModal"),
  { ssr: false }
);
const CommentSection = dynamic(
  () => import("@/components/trace/overlays/CommentSection"),
  { ssr: false }
);

export default function TraceWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const toast = useToast();
  const mapRef = useRef<HTMLDivElement>(null);

  // App bootstrap — initial loader hides after 2s max regardless of GPS
  const [appReady, setAppReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAppReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

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
  const [retryTrigger, setRetryTrigger] = useState(0);
  const gpsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPostSaveNameModal, setShowPostSaveNameModal] = useState(false);
  const [commentName, setCommentName] = useState<string | null>(null);
  const [isAuthor, setIsAuthor] = useState(false);

  // Check author status, load visitor name, ensure visitor_id
  useEffect(() => {
    const stored = localStorage.getItem("saved_traces");
    if (stored) {
      try {
        const traces = JSON.parse(stored);
        setIsAuthor(traces.some((t: { id: string }) => t.id === id));
      } catch {}
    }
    const storedName = localStorage.getItem("visitor_name");
    if (storedName) setCommentName(storedName);

    if (!localStorage.getItem("visitor_id")) {
      const newId = `v_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem("visitor_id", newId);
    }
  }, [id]);

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
  // Always runs — recording mode tracks path, replay mode tracks follower
  const { baseLocation, userLocation, isLoading: gpsLoading, loadingStage, hasGpsFix, retryGps } = useGPSTracker(
    true,
    (coords: [number, number], heading: number | null) => {
      // eslint-disable-next-line react-hooks/immutability
      handleLocationStream(coords, heading);
    },
    (updatedPath: [number, number][]) => {
      if (!isReplayMode && isRecording) {
        setTrailCoordinates(updatedPath);
        // eslint-disable-next-line react-hooks/immutability
        updateVectorPath(updatedPath);
      }
    }
  );

  // GPS timeout: show error/retry if GPS doesn't fix within 15s
  useEffect(() => {
    if (isReplayMode || gpsLoading || hasGpsFix) return;

    gpsTimeoutRef.current = setTimeout(() => {
      setGpsTimedOut(true);
    }, 15000);

    return () => {
      if (gpsTimeoutRef.current) {
        clearTimeout(gpsTimeoutRef.current);
        gpsTimeoutRef.current = null;
      }
    };
  }, [isReplayMode, gpsLoading, hasGpsFix, retryTrigger]);

  const handleRetryGps = useCallback(() => {
    retryGps();
    setGpsTimedOut(false);
    setRetryTrigger((t) => t + 1);
  }, [retryGps]);

  // Engine Connection #3: Replay guidance system
  const {
    guidanceState,
    distanceToStart,
    trailProgress,
    progressCoords,
    unlockedWaypointIds,
    activeWaypoint: unlockedWaypoint,
    startGuidance,
    dismissWaypoint,
    reset: resetGuidance,
  } = useReplayGuidance(
    userLocation,
    trailCoordinates,
    savedMedia,
    isReplayMode
  );

  // In replay mode, use unlocked waypoint from guidance OR manually tapped one
  const replayActiveWaypoint = unlockedWaypoint || activeWaypoint;
  const handleDismissWaypoint = useCallback(() => {
    dismissWaypoint();
    setActiveWaypoint(null);
  }, [dismissWaypoint]);

  // Engine Connection #1: Mapbox canvas lifecycle engine
  const {
    viewMode,
    toggleViewPerspective,
    handleLocationStream,
    updateVectorPath,
    centerOnCoords,
    mapError
  } = useMapEngine(
    mapRef,
    isReplayMode ? replayBaseLocation : baseLocation,
    setActiveWaypoint,
    trailCoordinates,
    savedMedia,
    isRecording,
    isReplayMode,
    guidanceState === "synced",
    guidanceState === "following",
    unlockedWaypointIds,
    progressCoords
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
    setIsSaving(false);

    // Prompt for name if not set (author flow)
    if (!localStorage.getItem("visitor_name")) {
      setShowPostSaveNameModal(true);
    } else {
      router.push("/dashboard");
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
    : !appReady;
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

        {/* Map load error state */}
        {mapError && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#f5f5f7]/90 backdrop-blur-sm">
            <div className="max-w-xs text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-black/80 mb-1">Map unavailable</p>
              <p className="text-xs font-medium text-black/40 leading-relaxed">{mapError}</p>
            </div>
          </div>
        )}

        {/* SIDE DRAWER MARKER NODE SHEETS — only in recording mode */}
        {!isReplayMode && (
          <WaypointSheet activeWaypoint={activeWaypoint} onClose={() => setActiveWaypoint(null)} />
        )}

        {/* REPLAY OVERLAYS: distance badge, sync, guidance, completion */}
        {isReplayMode && (
          <ReplayOverlay
            guidanceState={guidanceState}
            distanceToStart={distanceToStart}
            trailProgress={trailProgress}
            activeWaypoint={replayActiveWaypoint}
            onStartGuidance={startGuidance}
            onDismissWaypoint={handleDismissWaypoint}
            onBack={() => router.push("/dashboard")}
            onCommentsClick={() => {
              const storedName = localStorage.getItem("visitor_name");
              if (storedName) {
                setCommentName(storedName);
                setShowComments(true);
              } else {
                setShowNameModal(true);
              }
            }}
          />
        )}

        {/* Comment section (replay mode only) */}
        {isReplayMode && (
          <CommentSection
            traceId={id}
            traceTitle={traceTitleInput}
            isAuthor={isAuthor}
            isOpen={showComments}
            onClose={() => setShowComments(false)}
            onNameRequired={() => {
              setShowComments(false);
              setShowNameModal(true);
            }}
            visitorName={commentName}
          />
        )}

        {/* Name modal (for first-time commenters) */}
        <NameModal
          isOpen={showNameModal}
          onComplete={(name) => {
            setCommentName(name);
            setShowNameModal(false);
            // If they were trying to comment, reopen comments
            if (!showComments) setShowComments(true);
          }}
          title="What should we call you?"
        />

        {/* Name modal (after saving a trace, author flow) */}
        <NameModal
          isOpen={showPostSaveNameModal}
          onComplete={(name) => {
            setCommentName(name);
            setShowPostSaveNameModal(false);
            router.push("/dashboard");
          }}
          title="What should we call you?"
        />

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

            <LocationStatus hasGpsFix={hasGpsFix} gpsTimedOut={gpsTimedOut} onRetry={retryGps} />
            <RecordingTimer isRecording={isRecording} />

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
      <InitialLoader isLoading={showInitialLoader} loadingMessage={loadingMessageStr} onRetry={gpsTimedOut ? handleRetryGps : undefined} />
    </div>
  );
}