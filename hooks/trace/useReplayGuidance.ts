"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { WaypointMedia } from "@/types";

function getDistance(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const a2 =
    sinLat * sinLat +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
}

const SYNC_THRESHOLD = 15;
const WAYPOINT_UNLOCK_THRESHOLD = 25;
const COMPLETION_THRESHOLD = 20;

export function useReplayGuidance(
  userLocation: [number, number] | null,
  trailCoordinates: [number, number][],
  waypoints: WaypointMedia[],
  isReplayMode: boolean
) {
  const [guidanceState, setGuidanceState] = useState<"idle" | "synced" | "following" | "complete">("idle");
  const [distanceToStart, setDistanceToStart] = useState<number | null>(null);
  const [unlockedWaypointIds, setUnlockedWaypointIds] = useState<Set<string>>(new Set());
  const [activeWaypoint, setActiveWaypoint] = useState<WaypointMedia | null>(null);
  const [trailProgress, setTrailProgress] = useState(0);
  const [progressCoords, setProgressCoords] = useState<[number, number][]>([]);

  const syncedRef = useRef(false);
  const completedRef = useRef(false);
  const triggeredWpRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isReplayMode || !userLocation || trailCoordinates.length < 2) return;

    const start = trailCoordinates[0];
    const dist = getDistance(userLocation, start);
    setDistanceToStart(dist);

    if (dist <= SYNC_THRESHOLD && !syncedRef.current) {
      syncedRef.current = true;
      setGuidanceState("synced");
    }

    if (guidanceState === "following") {
      for (const wp of waypoints) {
        if (!triggeredWpRef.current.has(wp.id)) {
          const wpDist = getDistance(userLocation, wp.coordinates);
          if (wpDist <= WAYPOINT_UNLOCK_THRESHOLD) {
            triggeredWpRef.current.add(wp.id);
            setUnlockedWaypointIds((prev) => new Set(prev).add(wp.id));
            setActiveWaypoint(wp);
          }
        }
      }

      let closestIdx = 0;
      let minDist = Infinity;
      trailCoordinates.forEach((coord, i) => {
        const d = getDistance(userLocation, coord);
        if (d < minDist) {
          minDist = d;
          closestIdx = i;
        }
      });

      const progressPct = Math.round((closestIdx / (trailCoordinates.length - 1)) * 100);
      setTrailProgress(progressPct);

      setProgressCoords(trailCoordinates.slice(0, closestIdx + 1));

      const end = trailCoordinates[trailCoordinates.length - 1];
      const endDist = getDistance(userLocation, end);
      if (endDist <= COMPLETION_THRESHOLD && !completedRef.current) {
        completedRef.current = true;
        setGuidanceState("complete");
      }
    }
  }, [userLocation, isReplayMode, trailCoordinates, waypoints, guidanceState]);

  const startGuidance = useCallback(() => {
    setGuidanceState("following");
  }, []);

  const dismissWaypoint = useCallback(() => {
    setActiveWaypoint(null);
  }, []);

  const reset = useCallback(() => {
    syncedRef.current = false;
    completedRef.current = false;
    triggeredWpRef.current = new Set();
    setGuidanceState("idle");
    setDistanceToStart(null);
    setUnlockedWaypointIds(new Set());
    setActiveWaypoint(null);
    setTrailProgress(0);
    setProgressCoords([]);
  }, []);

  return {
    guidanceState,
    distanceToStart,
    trailProgress,
    progressCoords,
    unlockedWaypointIds,
    activeWaypoint,
    startGuidance,
    dismissWaypoint,
    reset,
  };
}
