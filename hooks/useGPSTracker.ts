"use client";

import { useState, useEffect, useRef } from "react";
import { LoadingStage, CACHE_KEY } from "@/types";

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

  const isRecordingRef = useRef(isRecording);
  const pathCoordsRef = useRef<[number, number][]>([]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Bootstrap Position
  useEffect(() => {
    async function prepareMap() {
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

      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        if (data.longitude && data.latitude) {
          setBaseLocation([data.longitude, data.latitude]);
        } else {
          setBaseLocation([3.3792, 6.5244]);
        }
      } catch {
        setBaseLocation([3.3792, 6.5244]);
      }
    }
    prepareMap();
  }, []);

  // Hardware Telemetry Stream
  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLoading(false);
      return;
    }

    let hasCache = false;
    try {
      if (localStorage.getItem(CACHE_KEY)) hasCache = true;
    } catch {}

    if (!hasCache) setLoadingStage("searching");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const rawLng = position.coords.longitude;
        const rawLat = position.coords.latitude;
        const accuracy = position.coords.accuracy;
        const heading = position.coords.heading;

        if (accuracy > 25 && isRecordingRef.current) return;

        let finalCoords: [number, number] = [rawLng, rawLat];

        setUserLocation((prev) => {
          if (prev) {
            finalCoords = [
              prev[0] * 0.25 + rawLng * 0.75,
              prev[1] * 0.25 + rawLat * 0.75,
            ];
          }

          onLocationUpdate(finalCoords, heading);

          if (isRecordingRef.current) {
            const history = pathCoordsRef.current;
            if (history.length === 0) {
              pathCoordsRef.current = [finalCoords];
              onPathAppend(pathCoordsRef.current);
            } else {
              const lastSavedPoint = history[history.length - 1];
              const distanceMoved = getDistanceMeters(lastSavedPoint, finalCoords);

              if (distanceMoved > 3.5) {
                pathCoordsRef.current = [...history, finalCoords];
                onPathAppend(pathCoordsRef.current);
              }
            }
          }

          return finalCoords;
        });

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify([rawLng, rawLat]));
        } catch (e) {}

        setLoadingStage("done");
        setIsLoading(false);
      },
      (error) => {
        console.error("GPS stream alert:", error);
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [onLocationUpdate, onPathAppend]);

  return { baseLocation, userLocation, isLoading, loadingStage, pathCoords: pathCoordsRef.current };
}
