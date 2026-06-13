"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LoadingStage, CACHE_KEY } from "@/types";
import { KalmanFilter } from "./kalmanFilter";

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

export function useGPSTracker(
  isRecording: boolean,
  onLocationUpdate: (coords: [number, number], heading: number | null) => void,
  onPathAppend: (path: [number, number][]) => void
) {
  const [baseLocation, setBaseLocation] = useState<[number, number] | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("booting");
  const [hasGpsFix, setHasGpsFix] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(0);
  const [gpsRetryCount, setGpsRetryCount] = useState(0);

  const retryGps = useCallback(() => {
    setGpsRetryCount((c) => c + 1);
    setHasGpsFix(false);
    setLoadingStage("searching");
    kalmanFilterRef.current.reset();
  }, []);

  const isRecordingRef = useRef(isRecording);
  const pathCoordsRef = useRef<[number, number][]>([]);
  const kalmanFilterRef = useRef<KalmanFilter>(new KalmanFilter());

  // FIX #1 & #2: Store callbacks in stable refs so they never appear in
  // useEffect dependency arrays. This prevents the GPS watchPosition from
  // being torn down and recreated on every single render.
  const onLocationUpdateRef = useRef(onLocationUpdate);
  const onPathAppendRef = useRef(onPathAppend);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
  }, [onLocationUpdate]);

  useEffect(() => {
    onPathAppendRef.current = onPathAppend;
  }, [onPathAppend]);

  // Bootstrap Position — get initial location from cache or IP
  useEffect(() => {
    async function prepareMap() {
      // 1. Try cached location first (instant)
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsedCoords = JSON.parse(cached) as [number, number];
          setBaseLocation(parsedCoords);
          setUserLocation(parsedCoords);
          setIsLoading(false);
          setLoadingStage("done");
          return;
        }
      } catch (e) {
        console.error("Cache read error:", e);
      }

      // 2. No cache — show "searching" while we fetch IP location
      setLoadingStage("searching");

      // FIX #3: The old code only set baseLocation here, leaving userLocation
      // as null. If GPS then failed or timed out, the map would render but the
      // ControlDeck would never appear (it gates on userLocation being set).
      // Now we set BOTH so the user always sees a usable map.
      let initialCoords: [number, number] = [-74.006, 40.7128];
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          if (data.longitude != null && data.latitude != null) {
            initialCoords = [data.longitude, data.latitude];
          }
        }
      } catch { }

      setBaseLocation(initialCoords);
      setUserLocation(initialCoords);
      setIsLoading(false);
      setLoadingStage("done");
    }
    prepareMap();
  }, []);

  // GPS Hardware Telemetry Stream — refines location in real-time
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const rawLng = position.coords.longitude;
        const rawLat = position.coords.latitude;
        const accuracy = position.coords.accuracy;
        const heading = position.coords.heading;

        if (accuracy > (isRecordingRef.current ? 25 : 100)) return;

        setGpsAccuracy(accuracy);

        const finalCoords = kalmanFilterRef.current.update(
          [rawLng, rawLat],
          accuracy,
          position.timestamp
        );

        setUserLocation(finalCoords);
        setHasGpsFix(true);

        // Callback outside state updater — no more side effects inside setUserLocation
        onLocationUpdateRef.current(finalCoords, heading);

        if (isRecordingRef.current) {
          const history = pathCoordsRef.current;
          if (history.length === 0) {
            pathCoordsRef.current = [finalCoords];
            onPathAppendRef.current(pathCoordsRef.current);
          } else {
            const lastSavedPoint = history[history.length - 1];
            const distanceMoved = getDistanceMeters(lastSavedPoint, finalCoords);

            if (distanceMoved > 1.5) {
              pathCoordsRef.current = [...history, finalCoords];
              onPathAppendRef.current(pathCoordsRef.current);
            }
          }
        }

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify([rawLng, rawLat]));
        } catch { }

        // If bootstrap hasn't finished yet, GPS arriving first clears loading
        setLoadingStage("done");
        setIsLoading(false);
      },
      (error) => {
        console.error("GPS stream alert:", error);
        // GPS failed — bootstrap will have already set a fallback location,
        // so just make sure the loading overlay is cleared.
        setIsLoading(false);
        setLoadingStage("done");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
    // FIX #2: Empty deps — callbacks are accessed via stable refs,
    // so this effect runs exactly once and the watch is never torn down.
  }, [gpsRetryCount]);

  return { baseLocation, userLocation, isLoading, loadingStage, hasGpsFix, gpsAccuracy, retryGps };
}
