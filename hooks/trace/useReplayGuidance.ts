"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WaypointMedia } from "@/types";

const START_THRESHOLD = 50;
const OFF_ROUTE_THRESHOLD = 30;
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

function findNearestOnTrail(
  user: [number, number],
  trail: [number, number][]
): { index: number; distance: number } {
  let minDist = Infinity;
  let minIndex = 0;
  for (let i = 0; i < trail.length; i++) {
    const d = getDistanceMeters(user, trail[i]);
    if (d < minDist) {
      minDist = d;
      minIndex = i;
    }
  }
  return { index: minIndex, distance: minDist };
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
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [offRouteDistance, setOffRouteDistance] = useState(0);
  const [trailProgress, setTrailProgress] = useState(0);
  const [activeWaypoint, setActiveWaypoint] = useState<WaypointMedia | null>(null);
  const triggeredRef = useRef(new Set<string>());

  const isNearStart =
    isReplayMode &&
    !hasStarted &&
    userLocation !== null &&
    trailCoordinates.length > 0 &&
    getDistanceMeters(userLocation, trailCoordinates[0]) < START_THRESHOLD;

  const distanceToStart =
    isReplayMode && !hasStarted && userLocation !== null && trailCoordinates.length > 0
      ? getDistanceMeters(userLocation, trailCoordinates[0])
      : null;

  useEffect(() => {
    if (!isReplayMode) {
      setHasStarted(false);
      setIsOffRoute(false);
      setActiveWaypoint(null);
      triggeredRef.current.clear();
    }
  }, [isReplayMode]);

  useEffect(() => {
    if (!isReplayMode || !hasStarted || !userLocation || trailCoordinates.length === 0) return;

    const nearest = findNearestOnTrail(userLocation, trailCoordinates);
    setIsOffRoute(nearest.distance > OFF_ROUTE_THRESHOLD);
    setOffRouteDistance(Math.round(nearest.distance));
    setTrailProgress(nearest.index / trailCoordinates.length);

    for (const wp of waypoints) {
      if (triggeredRef.current.has(wp.id)) continue;
      const dist = getDistanceMeters(userLocation, wp.coordinates);
      if (dist < WAYPOINT_THRESHOLD) {
        triggeredRef.current.add(wp.id);
        setActiveWaypoint(wp);
        break;
      }
    }
  }, [isReplayMode, hasStarted, userLocation, trailCoordinates, waypoints]);

  const startGuidance = useCallback(() => {
    setHasStarted(true);
    triggeredRef.current.clear();
    setActiveWaypoint(null);
  }, []);

  const dismissWaypoint = useCallback(() => {
    setActiveWaypoint(null);
  }, []);

  return {
    isNearStart,
    hasStarted,
    isOffRoute,
    offRouteDistance,
    distanceToStart,
    trailProgress,
    activeWaypoint,
    startGuidance,
    dismissWaypoint,
  };
}
