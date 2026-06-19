"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useToast } from "@/components/ui/Toast";

import { useGPSTracker } from "@/hooks/trace/useGPSTracker";
import { snapToRoads } from "@/utils/snapToRoads";
import { chaikinSmooth } from "@/hooks/trace/chaikinSmooth";
import { useRecordMapEngine } from "@/hooks/trace/useRecordMapEngine";
import { WaypointMedia, WaypointGroup } from "@/types";

import MapCanvas from "@/components/trace/MapCanvas";
import ControlDeck from "@/components/trace/ControlDeck";
import WaypointSheet from "@/components/trace/overlays/WaypointSheet";
import InitialLoader from "@/components/trace/overlays/InitialLoader";
import NameModal from "@/components/trace/NameModal";
import RecordingTimer from "@/components/trace/RecordingTimer";
import LocationStatus from "@/components/trace/LocationStatus";
import StopReviewBar from "@/components/trace/overlays/StopReviewBar";

const SaveReviewModal = dynamic(
  () => import("@/components/trace/overlays/SaveReviewModal"),
  { ssr: false }
);

interface RecordWorkspaceProps {
  id: string;
}

export default function RecordWorkspace({ id }: RecordWorkspaceProps) {
  const router = useRouter();
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
  const [activeGroupItems, setActiveGroupItems] = useState<WaypointMedia[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [showSaveReview, setShowSaveReview] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [showPolishedMap, setShowPolishedMap] = useState(false);
  const [traceTitleInput, setTraceTitleInput] = useState("Unfinished Trail Trace");
  const [trailCoordinates, setTrailCoordinates] = useState<[number, number][]>([]);
  const [traceDistance, setTraceDistance] = useState("0.0 mi");
  const [recordingStartedAt, setRecordingStartedAt] = useState<string>("");
  const [gpsTimedOut, setGpsTimedOut] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const gpsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savePhase, setSavePhase] = useState<"idle" | "saving" | "success">("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [showPostSaveNameModal, setShowPostSaveNameModal] = useState(false);

  const trailCoordsRef = useRef<[number, number][]>([]);
  const totalDistanceRef = useRef(0);
  const lastCoordRef = useRef<[number, number] | null>(null);
  const isStoppingRef = useRef(false);

  // Pending media uploads keyed by waypoint id
  // voice -> Blob, image -> data URL string
  const pendingMediaRef = useRef<Map<string, Blob | string>>(new Map());

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

  const formatDistanceFromMeters = (totalMeters: number) => {
    const miles = totalMeters / 1609.344;
    return `${miles.toFixed(1)} mi`;
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

  // Warn user before leaving with unsaved media
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingMediaRef.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const dataURLToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(",");
    const mimeMatch = parts[0]?.match(/:(.*?);/);
    const mime = mimeMatch?.[1] || "image/jpeg";
    const decoded = atob(parts[1] || "");
    const buf = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) buf[i] = decoded.charCodeAt(i);
    return new Blob([buf], { type: mime });
  };

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

  // Recalculate distance when trail changes
  useEffect(() => {
    setTraceDistance(formatDistance(trailCoordinates));
  }, [trailCoordinates]);

  // Engine Connection #2: Hardware device telemetry location tracking engine
  const { baseLocation, userLocation, isLoading: gpsLoading, loadingStage, hasGpsFix, gpsAccuracy, retryGps, resetRecording } = useGPSTracker(
    isRecording,
    (coords: [number, number], heading: number | null) => {
      handleLocationStream(coords, heading);
    },
    (updatedPath: [number, number][]) => {
      if (isRecording) {
        trailCoordsRef.current = updatedPath;
        updateVectorPath(updatedPath);

        if (updatedPath.length >= 2) {
          const last = updatedPath[updatedPath.length - 1];
          if (last !== lastCoordRef.current) {
            totalDistanceRef.current += getDistanceMeters(updatedPath[updatedPath.length - 2], last);
            lastCoordRef.current = last;
            setTraceDistance(formatDistanceFromMeters(totalDistanceRef.current));
          }
        }
      }
    }
  );

  // GPS timeout: show error/retry if GPS doesn't fix within 15s
  useEffect(() => {
    if (gpsLoading || hasGpsFix) return;

    gpsTimeoutRef.current = setTimeout(() => {
      setGpsTimedOut(true);
    }, 15000);

    return () => {
      if (gpsTimeoutRef.current) {
        clearTimeout(gpsTimeoutRef.current);
        gpsTimeoutRef.current = null;
      }
    };
  }, [gpsLoading, hasGpsFix, retryTrigger]);

  const handleRetryGps = useCallback(() => {
    retryGps();
    setGpsTimedOut(false);
    setRetryTrigger((t) => t + 1);
  }, [retryGps]);

  // Engine Connection #1: Mapbox canvas lifecycle engine
  const {
    viewMode,
    toggleViewPerspective,
    handleLocationStream,
    updateVectorPath,
    centerOnCoords,
    zoomIn,
    zoomOut,
    mapError
  } = useRecordMapEngine(
    mapRef,
    baseLocation,
    (group: WaypointGroup) => {
      setActiveGroupItems(group.items);
      setActiveGroupIndex(0);
      setActiveWaypoint(group.items[0]);
    },
    trailCoordinates,
    savedMedia,
    isRecording,
    gpsAccuracy
  );

  // Fallback pointer coordinate interceptor
  const getCurrentCapturePoint = () => {
    const coords = trailCoordsRef.current;
    return userLocation || baseLocation || coords[coords.length - 1] || [37.7749, -122.4194];
  };

  // --- INTERACTION INLINE DATA DISPATCHERS ---
  const handleSaveTextMarker = (text: string) => {
    const targetCoords = getCurrentCapturePoint();
    const newMedia: WaypointMedia = {
      id: `wp-${Date.now()}`,
      type: "text",
      content: text,
      category: "Note",
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
    const blobUrl = URL.createObjectURL(audioBlob);
    const newMedia: WaypointMedia = {
      id: wpId,
      type: "voice",
      content: "",
      category: "Voice Note",
      coordinates: targetCoords,
      fileUrl: blobUrl,
    };
    setSavedMedia((prev) => [...prev, newMedia]);
    setIsAddMenuOpen(false);
    (window as any).pendo?.track('Moment Added', { type: 'voice', duration: durationSec, traceId: id });

    const file = new File([audioBlob], `voice-${wpId}.webm`, { type: "audio/webm" });
    uploadFile(file, id, wpId).then((url) => {
      if (url) {
        pendingMediaRef.current.delete(wpId);
        setSavedMedia((prev) =>
          prev.map((m) => (m.id === wpId ? { ...m, fileUrl: url } : m))
        );
      }
    });
  };

  const handleSavePhotoMarker = (imageDataUrl: string) => {
    const targetCoords = getCurrentCapturePoint();
    const wpId = `wp-${Date.now()}`;
    pendingMediaRef.current.set(wpId, imageDataUrl);
    const imageBlob = dataURLToBlob(imageDataUrl);
    const blobUrl = URL.createObjectURL(imageBlob);
    const newMedia: WaypointMedia = {
      id: wpId,
      type: "image",
      content: "",
      category: "Photo",
      coordinates: targetCoords,
      fileUrl: blobUrl,
    };
    setSavedMedia((prev) => [...prev, newMedia]);
    setIsAddMenuOpen(false);
    (window as any).pendo?.track('Moment Added', { type: 'image', traceId: id });

    const file = new File([imageBlob], `photo-${wpId}.jpg`, { type: "image/jpeg" });
    uploadFile(file, id, wpId).then((url) => {
      if (url) {
        pendingMediaRef.current.delete(wpId);
        URL.revokeObjectURL(blobUrl);
        setSavedMedia((prev) =>
          prev.map((m) => (m.id === wpId ? { ...m, fileUrl: url } : m))
        );
      }
    });
  };

  const getNextUntitledTitle = () => {
    try {
      let counter = parseInt(localStorage.getItem("untitled_counter") || "0", 10);
      counter += 1;
      localStorage.setItem("untitled_counter", String(counter));
      return `Untitled ${counter}`;
    } catch {
      return "Untitled";
    }
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      if (isStoppingRef.current) return;
      isStoppingRef.current = true;

      setIsRecording(false);
      setIsAddMenuOpen(false);
      setTraceTitleInput(getNextUntitledTitle());

      const currentTrail = trailCoordsRef.current;

      setIsPolishing(true);
      snapToRoads(currentTrail).then((snapped) => {
        setTrailCoordinates(snapped);
        updateVectorPath(snapped);
        setTraceDistance(formatDistance(snapped));

        setIsPolishing(false);
        setShowPolishedMap(true);
        setTimeout(() => {
          setShowPolishedMap(false);
          setShowSaveReview(true);
          isStoppingRef.current = false;
        }, 800);
      }).catch((err) => {
        console.error("Snapping failed, falling back to smoothed trail:", err);
        const fallback = chaikinSmooth(currentTrail);
        setTrailCoordinates(fallback);
        updateVectorPath(fallback);
        setTraceDistance(formatDistance(fallback));

        setIsPolishing(false);
        setShowSaveReview(true);
        isStoppingRef.current = false;
      });
    } else {
      resetRecording();
      trailCoordsRef.current = [];
      totalDistanceRef.current = 0;
      lastCoordRef.current = null;
      setTraceDistance("0.0 mi");
      setTrailCoordinates([]);
      setIsRecording(true);
      setIsAddMenuOpen(false);
      setRecordingStartedAt(new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }));
    }
  };

  const handleCommitSaveTrace = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSavePhase("saving");

    const uploadedUrls = new Map<string, string>();
    const pendingContentUrls = new Map<string, string>();
    const uploadPromises: Promise<void>[] = [];

    for (const wp of savedMedia) {
      const pendingData = pendingMediaRef.current.get(wp.id);
      if (!pendingData) continue;

      if (wp.type === "voice") {
        const blob = pendingData as Blob;
        uploadPromises.push(
          (async () => {
            try {
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              pendingContentUrls.set(wp.id, dataUrl);
            } catch (e) {
              console.error("Failed to convert voice blob to data URL", e);
            }
            const file = new File([blob], `voice-${wp.id}.webm`, { type: "audio/webm" });
            const url = await uploadFile(file, id, wp.id);
            if (url) uploadedUrls.set(wp.id, url);
          })()
        );
      } else if (wp.type === "image") {
        pendingContentUrls.set(wp.id, pendingData as string);
        uploadPromises.push(
          (async () => {
            try {
              const dataUrl = pendingData as string;
              const res = await fetch(dataUrl);
              const blob = await res.blob();
              const file = new File([blob], `photo-${wp.id}.jpg`, { type: "image/jpeg" });
              const url = await uploadFile(file, id, wp.id);
              if (url) uploadedUrls.set(wp.id, url);
            } catch (e) {
              console.error("Failed to upload image for waypoint", wp.id, e);
            }
          })()
        );
      }
    }

    await Promise.all(uploadPromises);

    for (const m of savedMedia) {
      if (m.fileUrl?.startsWith("blob:")) URL.revokeObjectURL(m.fileUrl);
    }

    const finalMedia = savedMedia.map((m) =>
      uploadedUrls.has(m.id)
        ? { ...m, fileUrl: uploadedUrls.get(m.id)!, content: "" }
        : pendingContentUrls.has(m.id)
          ? { ...m, fileUrl: pendingContentUrls.get(m.id)!, content: pendingContentUrls.get(m.id)! }
          : m
    );

    pendingMediaRef.current.clear();

    const dateString = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const newTrace = {
      id: id,
      title: traceTitleInput || "Unfinished Trail Trace",
      link: `${window.location.origin}/trace/${id}`,
      date: dateString,
      coordinates: trailCoordinates,
      waypoints: finalMedia,
      distance: traceDistance,
    };

    const visitorId = localStorage.getItem("visitor_id") || undefined;
    try {
      const res = await fetch("/api/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTrace, visitor_id: visitorId }),
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
    setSavePhase("success");

    await new Promise((r) => setTimeout(r, 800));

    if (!localStorage.getItem("visitor_name")) {
      setShowPostSaveNameModal(true);
    } else {
      router.push("/dashboard");
    }
  };

  const handleCloseSaveReview = () => {
    setShowSaveReview(false);
    setSavePhase("idle");
  };

  const handleDiscardTrace = () => {
    setShowSaveReview(false);
    setTrailCoordinates([]);
    trailCoordsRef.current = [];
    totalDistanceRef.current = 0;
    lastCoordRef.current = null;
    setSavedMedia([]);
    setTraceDistance("0.0 mi");
    toast.info("Trace discarded");
  };

  const loadingMessage = {
    booting: "Preparing workspace",
    searching: "Finding nearby position",
    improving: "Improving GPS accuracy",
    done: "Location connected",
  }[loadingStage];

  const showInitialLoader = !appReady;
  const loadingMessageStr = gpsTimedOut ? "Could not find location" : loadingMessage;

  return (
    <div className="relative flex w-screen h-screen overflow-hidden bg-[#f5f5f7] font-sans selection:bg-black selection:text-white">
      <div className="relative flex-1 h-full min-w-0 transition-all duration-300 z-0">
        <style>{`.mapboxgl-ctrl-logo,.mapboxgl-ctrl-attrib{display:none!important}`}</style>

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
        <WaypointSheet
          activeWaypoint={activeGroupItems[activeGroupIndex] || null}
          groupItems={activeGroupItems}
          groupIndex={activeGroupIndex}
          itemCount={activeGroupItems.length}
          onPrev={() => setActiveGroupIndex((i) => Math.max(0, i - 1))}
          onNext={() => setActiveGroupIndex((i) => Math.min(activeGroupItems.length - 1, i + 1))}
          onClose={() => { setActiveWaypoint(null); setActiveGroupItems([]); }}
        />

        {/* INPUT HARDWARE CONTROL DECK CORE PANEL */}
        {!showInitialLoader && !showSaveReview && !isPolishing && !showPolishedMap && (
          <>
            {/* Top-left button group */}
            {!isRecording && (
              <div className="absolute top-5 left-5 z-40">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-2xl border border-black/[0.05] shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-90 transition-all duration-200 hover:bg-white group"
                  title="Back to dashboard"
                >
                  <svg className="w-4 h-4 text-black/60 group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
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

            {/* Bottom-right: zoom + re-center (desktop) */}
            <div className="hidden md:flex absolute bottom-5 right-5 z-40 flex-col items-center gap-2">
              <button
                onClick={() => userLocation && centerOnCoords(userLocation)}
                className="w-9 h-9 rounded-xl bg-white/70 backdrop-blur-xl border border-black/[0.04] flex items-center justify-center active:scale-90 transition-all hover:bg-white/90"
                title="Re-center on location"
              >
                <svg className="w-[15px] h-[15px] text-black/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                </svg>
              </button>
              <div className="bg-white/70 backdrop-blur-xl border border-black/[0.04] rounded-xl overflow-hidden">
                <button
                  onClick={() => zoomIn?.()}
                  className="w-9 h-9 flex items-center justify-center active:scale-90 transition-all hover:bg-white/90"
                  title="Zoom in"
                >
                  <span className="text-[16px] font-semibold text-black/40 leading-none">+</span>
                </button>
                <div className="h-[1px] bg-black/[0.06] mx-2" />
                <button
                  onClick={() => zoomOut?.()}
                  className="w-9 h-9 flex items-center justify-center active:scale-90 transition-all hover:bg-white/90"
                  title="Zoom out"
                >
                  <span className="text-[16px] font-semibold text-black/40 leading-none">−</span>
                </button>
              </div>
            </div>

            {/* Mobile: re-center only (bottom-left), hides when ActionDock is open */}
            <div className={`md:hidden absolute bottom-5 left-5 z-40 transition-opacity duration-200 ${isRecording && isAddMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <button
                onClick={() => userLocation && centerOnCoords(userLocation)}
                className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-2xl border border-black/[0.05] shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-90 transition-all duration-200"
                title="Re-center on location"
              >
                <svg className="w-[16px] h-[16px] text-black/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* POST-RECORDING SAVE REVIEW MODAL (desktop) */}
      <div className="hidden md:block">
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
          savePhase={savePhase}
          createdAt={recordingStartedAt}
        />
      </div>

      {/* Mobile: stop review bar (bottom) */}
      {showSaveReview && !isRecording && (
        <div className="md:hidden">
          <StopReviewBar
            distance={traceDistance}
            onDiscard={handleDiscardTrace}
            onSave={() => handleCommitSaveTrace()}
          />
        </div>
      )}

      {/* POLISHING ROUTE OVERLAY — full opaque cover, fades out softly */}
      <div
        className={`absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#f5f5f7] transition-opacity duration-500 ${
          isPolishing ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-8 h-8 border-2 border-black/20 border-t-black rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-black/60">Polishing your route...</p>
      </div>

      {/* Post-save Name modal */}
      <NameModal
        isOpen={showPostSaveNameModal}
        onComplete={(name) => {
          localStorage.setItem("visitor_name", name);
          setShowPostSaveNameModal(false);
          router.push("/dashboard");
        }}
        title="What should we call you?"
      />

      {/* BLOCKING HARDWARE LOADING TIMELINE MASK */}
      <InitialLoader isLoading={showInitialLoader} loadingMessage={loadingMessageStr} onRetry={gpsTimedOut ? handleRetryGps : undefined} />
    </div>
  );
}
