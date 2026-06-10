"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WaypointMedia } from "@/types";

const SYNC_THRESHOLD = 15;
const WAYPOINT_THRESHOLD = 25;

function getDistanceMeters(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aCalc =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
}

interface UseReplayGuidanceOptions {
  trailCoordinates: [number, number][];
  waypoints: WaypointMedia[];
  userLocation: [number, number] | null;
  isReplayMode: boolean;
}

export function useReplayGuidance({
  trailCoordinates,
  waypoints,
  userLocation,
  isReplayMode,
}: UseReplayGuidanceOptions) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [distanceToStart, setDistanceToStart] = useState<number | null>(null);
  const [unlockedWaypoints, setUnlockedWaypoints] = useState<WaypointMedia[]>([]);
  const [activeWaypoint, setActiveWaypoint] = useState<WaypointMedia | null>(null);
  const triggeredRef = useRef(new Set<string>());

  useEffect(() => {
    if (!isReplayMode) {
      setHasStarted(false);
      setIsSynced(false);
      setUnlockedWaypoints([]);
      setActiveWaypoint(null);
      triggeredRef.current.clear();
    }
  }, [isReplayMode]);

  useEffect(() => {
    if (!isReplayMode || !userLocation || trailCoordinates.length === 0) {
      setDistanceToStart(null);
      setIsSynced(false);
      return;
    }

    const dist = getDistanceMeters(userLocation, trailCoordinates[0]);
    setDistanceToStart(dist);

    if (!hasStarted) {
      setIsSynced(dist < SYNC_THRESHOLD);
    }
  }, [isReplayMode, userLocation, trailCoordinates, hasStarted]);

  useEffect(() => {
    if (!isReplayMode || !hasStarted || !userLocation || trailCoordinates.length === 0) return;

    for (const wp of waypoints) {
      if (triggeredRef.current.has(wp.id)) continue;
      const dist = getDistanceMeters(userLocation, wp.coordinates);
      if (dist < WAYPOINT_THRESHOLD) {
        triggeredRef.current.add(wp.id);
        setUnlockedWaypoints((prev) => [...prev, wp]);
        setActiveWaypoint(wp);
        break;
      }
    }
  }, [isReplayMode, hasStarted, userLocation, trailCoordinates, waypoints]);

  const startGuidance = useCallback(() => {
    setHasStarted(true);
    setIsSynced(false);
  }, []);

  const dismissWaypoint = useCallback(() => {
    setActiveWaypoint(null);
  }, []);

  return {
    isSynced,
    hasStarted,
    distanceToStart,
    unlockedWaypoints,
    activeWaypoint,
    startGuidance,
    dismissWaypoint,
  };
}
