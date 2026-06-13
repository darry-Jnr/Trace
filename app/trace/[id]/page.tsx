"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useToast } from "@/components/ui/Toast";

import { useGPSTracker } from "@/hooks/trace/useGPSTracker";
import { snapToRoads } from "@/utils/snapToRoads";
import { useMapEngine } from "@/hooks/trace/useMapEngine";
import { useReplayGuidance } from "@/hooks/trace/useReplayGuidance";
import { WaypointMedia } from "@/types";
import type { WaypointGroup } from "@/types";

import MapCanvas from "@/components/trace/MapCanvas";
import ControlDeck from "@/components/trace/ControlDeck";
import WaypointSheet from "@/components/trace/overlays/WaypointSheet";
import InitialLoader from "@/components/trace/overlays/InitialLoader";
import ReplayOverlay from "@/components/trace/overlays/ReplayOverlay";
import NameModal from "@/components/trace/NameModal";
import RecordingTimer from "@/components/trace/RecordingTimer";
import LocationStatus from "@/components/trace/LocationStatus";
import StopReviewBar from "@/components/trace/overlays/StopReviewBar";

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
  const [activeGroupItems, setActiveGroupItems] = useState<WaypointMedia[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [showSaveReview, setShowSaveReview] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [showPolishedMap, setShowPolishedMap] = useState(false);
  const [traceTitleInput, setTraceTitleInput] = useState("Unfinished Trail Trace");
  const [trailCoordinates, setTrailCoordinates] = useState<[number, number][]>([]);
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [replayBaseLocation, setReplayBaseLocation] = useState<[number, number] | null>(null);
  const [traceDistance, setTraceDistance] = useState("0.0 mi");
  const [traceDate, setTraceDate] = useState("");

  // Simulator states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedIndex, setSimulatedIndex] = useState(0);
  const [isSimPlay, setIsSimPlay] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState<1 | 3 | 10>(1);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simulatedIndexRef = useRef(0);

  const [isSaving, setIsSaving] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<string>("");
  const [gpsTimedOut, setGpsTimedOut] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const gpsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savePhase, setSavePhase] = useState<"idle" | "saving" | "success">("idle");
  const trailCoordsRef = useRef<[number, number][]>([]);
  const totalDistanceRef = useRef(0);
  const lastCoordRef = useRef<[number, number] | null>(null);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPostSaveNameModal, setShowPostSaveNameModal] = useState(false);
  const [commentName, setCommentName] = useState<string | null>(null);
  const [isAuthor, setIsAuthor] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  // Check author status, load visitor name, ensure visitor_id, fetch comment count
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

    fetch(`/api/trace/${id}/comments`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setCommentCount(res.count);
      })
      .catch(() => {});
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
            (window as any).pendo?.track('Trace Opened', { traceId: id, source: 'shared_link', title: fetchedTrace.title, waypointCount: fetchedTrace.waypoints?.length || 0, distance: fetchedTrace.distance });

            // Save to recently_viewed for dashboard
            try {
              const recentRaw = localStorage.getItem("recently_viewed");
              const recent = recentRaw ? JSON.parse(recentRaw) : [];
              const entry = {
                id: fetchedTrace.id,
                title: fetchedTrace.title,
                date: fetchedTrace.date,
                distance: fetchedTrace.distance,
              };
              // Dedupe by id, then prepend
              const deduped = recent.filter((r: any) => r.id !== entry.id);
              deduped.unshift(entry);
              // Cap at 10
              localStorage.setItem("recently_viewed", JSON.stringify(deduped.slice(0, 10)));
            } catch (e) {
              console.error("Failed to save to recently_viewed:", e);
            }

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
    isRecording,
    (coords: [number, number], heading: number | null) => {
      // eslint-disable-next-line react-hooks/immutability
      handleLocationStream(coords, heading);
    },
    (updatedPath: [number, number][]) => {
      if (!isReplayMode && isRecording) {
        trailCoordsRef.current = updatedPath;
        updateVectorPath(updatedPath, false);

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
    syncPrompt,
    skipPercent,
    startGuidance,
    dismissSyncPrompt,
    dismissWaypoint,
    reset: resetGuidance,
  } = useReplayGuidance(
    isSimulating ? (trailCoordinates[simulatedIndex] ?? userLocation) : userLocation,
    trailCoordinates,
    savedMedia,
    isReplayMode
  );

  // Track trail completion for in-person guidance (not simulation)
  useEffect(() => {
    if (guidanceState === "complete" && !isSimulating) {
      (window as any).pendo?.track('Trail Completed', { traceId: id, trailProgress });
    }
  }, [guidanceState, id, trailProgress, isSimulating]);

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
  } = useMapEngine(
    mapRef,
    isReplayMode ? replayBaseLocation : baseLocation,
    (group: WaypointGroup) => {
      setActiveGroupItems(group.items);
      setActiveGroupIndex(0);
      setActiveWaypoint(group.items[0]);
    },
    trailCoordinates,
    savedMedia,
    isRecording,
    isReplayMode,
    guidanceState === "synced",
    guidanceState === "following",
    unlockedWaypointIds,
    progressCoords,
    distanceToStart
  );

  // Simulator tick — advances simulatedIndex each frame at chosen speed
  useEffect(() => {
    if (!isSimulating) return;

    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    if (!isSimPlay) return;

    // Step size: how many coord indices to advance per tick
    // 1x → 1 step/200ms; 3x → 3 steps/200ms; 10x → 10 steps/200ms
    const TICK_MS = 200;
    simIntervalRef.current = setInterval(() => {
      const total = trailCoordinates.length;
      if (total < 2) return;

      const next = simulatedIndexRef.current + simulationSpeed;
      if (next >= total - 1) {
        simulatedIndexRef.current = total - 1;
        setSimulatedIndex(total - 1);
        setIsSimPlay(false);
        if (simIntervalRef.current) clearInterval(simIntervalRef.current);
        return;
      }

      simulatedIndexRef.current = next;
      setSimulatedIndex(next);

      // Drive the map camera to follow the simulated marker
      handleLocationStream(trailCoordinates[next], null);
    }, TICK_MS);

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [isSimulating, isSimPlay, simulationSpeed, trailCoordinates, handleLocationStream]);

  const handleStartSimulation = useCallback(() => {
    if (trailCoordinates.length < 2) return;
    (window as any).pendo?.track('Simulation Started', { traceId: id, traceTitle: traceTitleInput, coordinateCount: trailCoordinates.length, distance: traceDistance });
    simulatedIndexRef.current = 0;
    setSimulatedIndex(0);
    setIsSimPlay(true);
    setIsSimulating(true);
    // Engage guidance so progress trail starts painting
    startGuidance();
    // Jump map to start of trail
    centerOnCoords(trailCoordinates[0]);
  }, [trailCoordinates, startGuidance, centerOnCoords, id, traceTitleInput, traceDistance]);

  const handleStopSimulation = useCallback(() => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    setIsSimulating(false);
    setIsSimPlay(false);
    simulatedIndexRef.current = 0;
    setSimulatedIndex(0);
    resetGuidance();
  }, [resetGuidance]);

  const handleSeekSimulation = useCallback((percent: number) => {
    const total = trailCoordinates.length;
    if (total < 2) return;
    const idx = Math.round((percent / 100) * (total - 1));
    simulatedIndexRef.current = idx;
    setSimulatedIndex(idx);
    handleLocationStream(trailCoordinates[idx], null);
  }, [trailCoordinates, handleLocationStream]);

  // Derived simulation progress (0–100)
  const simulationProgress = trailCoordinates.length > 1
    ? Math.round((simulatedIndex / (trailCoordinates.length - 1)) * 100)
    : 0;

  // In replay mode, use unlocked waypoint from guidance OR manually tapped one
  const replayActiveWaypoint = unlockedWaypoint || activeWaypoint;
  const handleDismissWaypoint = useCallback(() => {
    dismissWaypoint();
    setActiveWaypoint(null);
    setActiveGroupItems([]);
  }, [dismissWaypoint]);




  // Fallback fallback pointer coordinate interceptor
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

    // Immediately upload in the background — upgrades blob URL to permanent Supabase URL
    const file = new File([audioBlob], `voice-${wpId}.webm`, { type: "audio/webm" });
    uploadFile(file, id, wpId).then((url) => {
      if (url) {
        pendingMediaRef.current.delete(wpId); // already uploaded — no need to re-upload at save
        URL.revokeObjectURL(blobUrl);
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
    // Convert data URL to blob URL for preview (avoids storing large base64 in state/localStorage)
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

    // Immediately upload in the background — upgrades blob URL to permanent Supabase URL
    const file = new File([imageBlob], `photo-${wpId}.jpg`, { type: "image/jpeg" });
    uploadFile(file, id, wpId).then((url) => {
      if (url) {
        pendingMediaRef.current.delete(wpId); // already uploaded — no need to re-upload at save
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
      (window as any).pendo?.track('Recording Stopped', { traceId: id, distance: formatDistanceFromMeters(totalDistanceRef.current), waypointCount: savedMedia.length, coordinateCount: trailCoordsRef.current.length });
      setIsRecording(false);
      setTraceTitleInput(getNextUntitledTitle());
      setTrailCoordinates(trailCoordsRef.current);
      updateVectorPath(trailCoordsRef.current);

      setIsPolishing(true);
      snapToRoads(trailCoordsRef.current).then((snapped) => {
        setTrailCoordinates(snapped);
        updateVectorPath(snapped);
        setIsPolishing(false);
        setShowPolishedMap(true);
        setTimeout(() => {
          setShowPolishedMap(false);
          setShowSaveReview(true);
        }, 800);
      });
    } else {
      setIsRecording(true);
      setIsAddMenuOpen(false);
      setRecordingStartedAt(new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }));
      (window as any).pendo?.track('Recording Started', { traceId: id, hasGpsFix });
    }
  };

  const handleCommitSaveTrace = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSavePhase("saving");

    // 1. Upload any pending media files to Supabase Storage
    const uploadedUrls = new Map<string, string>();
    const uploadPromises: Promise<void>[] = [];
    for (const wp of savedMedia) {
      const pendingData = pendingMediaRef.current.get(wp.id);
      if (!pendingData) continue;

      if (wp.type === "voice") {
        const blob = pendingData as Blob;
        const file = new File([blob], `voice-${wp.id}.webm`, { type: "audio/webm" });
        uploadPromises.push(
          uploadFile(file, id, wp.id).then((url) => {
            if (url) uploadedUrls.set(wp.id, url);
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
              if (url) uploadedUrls.set(wp.id, url);
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

    // Revoke old blob URLs to prevent memory leaks
    for (const m of savedMedia) {
      if (m.fileUrl?.startsWith("blob:")) URL.revokeObjectURL(m.fileUrl);
    }

    // Merge uploaded URLs into media before saving
    const finalMedia = savedMedia.map((m) =>
      uploadedUrls.has(m.id) ? { ...m, fileUrl: uploadedUrls.get(m.id)! } : m
    );

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

    // 2. Save to Supabase database
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
    setSavePhase("success");

    // Wait a beat so user sees the "Saved!" state, then navigate
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
    (window as any).pendo?.track('Trace Discarded', { traceId: id, distance: traceDistance, waypointCount: savedMedia.length });
    setShowSaveReview(false);
    setTrailCoordinates([]);
    trailCoordsRef.current = [];
    totalDistanceRef.current = 0;
    lastCoordRef.current = null;
    setSavedMedia([]);
    setTraceDistance("0.0 mi");
    toast.info("Trace discarded");
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
        {!isReplayMode && (
          <WaypointSheet
            activeWaypoint={activeGroupItems[activeGroupIndex] || null}
            groupItems={activeGroupItems}
            groupIndex={activeGroupIndex}
            itemCount={activeGroupItems.length}
            onPrev={() => setActiveGroupIndex((i) => Math.max(0, i - 1))}
            onNext={() => setActiveGroupIndex((i) => Math.min(activeGroupItems.length - 1, i + 1))}
            onClose={() => { setActiveWaypoint(null); setActiveGroupItems([]); }}
          />
        )}

        {/* REPLAY OVERLAYS: distance badge, sync, guidance, completion */}
        {isReplayMode && (
          <ReplayOverlay
            guidanceState={guidanceState}
            distanceToStart={distanceToStart}
            trailProgress={trailProgress}
            activeWaypoint={replayActiveWaypoint}
            syncPrompt={syncPrompt}
            skipPercent={skipPercent}
            onStartGuidance={() => {
              (window as any).pendo?.track('Trail Guidance Started', { traceId: id, syncType: syncPrompt || 'start', skipPercent, distanceToStart });
              startGuidance();
            }}
            onDismissSyncPrompt={dismissSyncPrompt}
            onDismissWaypoint={handleDismissWaypoint}
            onBack={() => router.push("/dashboard")}
            commentCount={commentCount}
            onRetrace={() => resetGuidance()}
            onCommentsClick={() => {
              const storedName = localStorage.getItem("visitor_name");
              if (storedName) {
                setCommentName(storedName);
                setShowComments(true);
              } else {
                setShowNameModal(true);
              }
            }}
            isSimulating={isSimulating}
            isSimPlay={isSimPlay}
            simulationSpeed={simulationSpeed}
            simulationProgress={simulationProgress}
            onStartSimulation={handleStartSimulation}
            onStopSimulation={handleStopSimulation}
            onToggleSimPlay={() => setIsSimPlay((p) => !p)}
            onChangeSimSpeed={(s) => setSimulationSpeed(s)}
            onSeekSimulation={handleSeekSimulation}
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
            onCommentPosted={() => setCommentCount((c) => c + 1)}
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
        {!showInitialLoader && !isReplayMode && !showSaveReview && !isPolishing && !showPolishedMap && (
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
      {!isReplayMode && (
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
      )}

      {/* Mobile: stop review bar (bottom) */}
      {!isReplayMode && showSaveReview && !isRecording && (
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

      {/* BLOCKING HARDWARE LOADING TIMELINE MASK */}
      <InitialLoader isLoading={showInitialLoader} loadingMessage={loadingMessageStr} onRetry={gpsTimedOut ? handleRetryGps : undefined} />
    </div>
  );
}