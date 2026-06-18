"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { useGPSTracker } from "@/hooks/trace/useGPSTracker";
import { useReplayMapEngine } from "@/hooks/trace/useReplayMapEngine";
import { useReplayGuidance } from "@/hooks/trace/useReplayGuidance";
import { WaypointMedia, WaypointGroup } from "@/types";

import MapCanvas from "@/components/trace/MapCanvas";
import ReplayOverlay from "@/components/trace/overlays/ReplayOverlay";
import NameModal from "@/components/trace/NameModal";
import InitialLoader from "@/components/trace/overlays/InitialLoader";

const CommentSection = dynamic(
  () => import("@/components/trace/overlays/CommentSection"),
  { ssr: false }
);

interface ReplayWorkspaceProps {
  id: string;
  initialData: {
    title: string;
    coordinates: [number, number][];
    waypoints: WaypointMedia[];
    distance: string;
    date: string;
    isAuthor: boolean;
  };
}

export default function ReplayWorkspace({ id, initialData }: ReplayWorkspaceProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);

  // Core Replay Data
  const [trailCoordinates] = useState<[number, number][]>(initialData.coordinates);
  const [savedMedia] = useState<WaypointMedia[]>(initialData.waypoints);
  const [replayBaseLocation] = useState<[number, number] | null>(
    initialData.coordinates.length > 0 ? initialData.coordinates[0] : null
  );
  const [traceTitleInput] = useState<string>(initialData.title);
  const [isAuthor] = useState<boolean>(initialData.isAuthor);

  // Comments & Visitor identity states
  const [showComments, setShowComments] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [commentName, setCommentName] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(0);

  // Active waypoints state (tapped or unlocked)
  const [activeWaypoint, setActiveWaypoint] = useState<WaypointMedia | null>(null);
  const [activeGroupItems, setActiveGroupItems] = useState<WaypointMedia[]>([]);
  const [, setActiveGroupIndex] = useState(0);

  // GPS/Loading State
  const [gpsTimedOut, setGpsTimedOut] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const gpsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check visitor name, ensure visitor_id, fetch comment count
  useEffect(() => {
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

  // GPS Stream tracking (in replay mode, doesn't append path)
  const { baseLocation, userLocation, isLoading: gpsLoading, hasGpsFix, gpsAccuracy, retryGps } = useGPSTracker(
    false, // isRecording = false
    (coords: [number, number], heading: number | null) => {
      handleLocationStream(coords, heading);
    },
    () => {} // onPathAppend = noop
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

  // Guidance logic
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
    userLocation,
    trailCoordinates,
    savedMedia,
    true // isReplayMode = true
  );

  // Map engine connection
  const {
    handleLocationStream,
    zoomIn,
    zoomOut,
    mapError,
  } = useReplayMapEngine(
    mapRef,
    replayBaseLocation || baseLocation,
    (group: WaypointGroup) => {
      setActiveGroupItems(group.items);
      setActiveGroupIndex(0);
      setActiveWaypoint(group.items[0]);
    },
    trailCoordinates,
    savedMedia,
    guidanceState === "synced",
    guidanceState === "following",
    unlockedWaypointIds,
    progressCoords,
    gpsAccuracy
  );

  // In replay mode, use unlocked waypoint from guidance OR manually tapped one
  const replayActiveWaypoint = unlockedWaypoint || activeWaypoint;
  const handleDismissWaypoint = useCallback(() => {
    dismissWaypoint();
    setActiveWaypoint(null);
    setActiveGroupItems([]);
  }, [dismissWaypoint]);

  const showInitialLoader = !replayBaseLocation;
  const loadingMessageStr = "Loading saved trace...";

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

        {/* REPLAY OVERLAYS: distance badge, sync, guidance, completion */}
        <ReplayOverlay
          guidanceState={guidanceState}
          distanceToStart={distanceToStart}
          trailProgress={trailProgress}
          activeWaypoint={replayActiveWaypoint}
          syncPrompt={syncPrompt}
          skipPercent={skipPercent}
          onStartGuidance={startGuidance}
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
        />

        {/* Comment section */}
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

        {/* Name modal (for first-time commenters) */}
        <NameModal
          isOpen={showNameModal}
          onComplete={(name) => {
            localStorage.setItem("visitor_name", name);
            setCommentName(name);
            setShowNameModal(false);
            if (!showComments) setShowComments(true);
          }}
          title="What should we call you?"
        />

        {/* Desktop zoom controls */}
        <div className="hidden md:flex absolute bottom-5 right-5 z-40 flex-col items-center gap-2">
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
      </div>

      {/* DEBUG: trail coordinate info */}
      {!showInitialLoader && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] px-3 py-1.5 rounded-full bg-black/80 text-white text-[11px] font-mono tracking-tight shadow-lg pointer-events-none">
          Trail: {trailCoordinates.length} pts
          {trailCoordinates.length > 0 && (
            <> &nbsp;|&nbsp; first: {trailCoordinates[0][0].toFixed(4)}, {trailCoordinates[0][1].toFixed(4)}</>
          )}
        </div>
      )}

      {/* BLOCKING HARDWARE LOADING TIMELINE MASK */}
      <InitialLoader isLoading={showInitialLoader} loadingMessage={loadingMessageStr} onRetry={gpsTimedOut ? handleRetryGps : undefined} />
    </div>
  );
}
