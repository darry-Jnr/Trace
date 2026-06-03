"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type LoadingStage =
  | "booting"
  | "searching"
  | "improving"
  | "done";

export default function Dashboard() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const accuracyCircleRef = useRef<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const [baseLocation, setBaseLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("booting");

  // STEP 1: Fast IP boot
  useEffect(() => {
    async function prepareMap() {
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

  // STEP 2: Initialize map once
  useEffect(() => {
    if (!baseLocation || !mapRef.current || mapInstanceRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: baseLocation,
      zoom: 14,
    });

    const marker = new mapboxgl.Marker({ color: "#0052FF" })
      .setLngLat(baseLocation)
      .addTo(map);

    // add accuracy circle source and layer
    map.on("load", () => {
      map.addSource("accuracy-circle", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: baseLocation,
          },
        },
      });

      map.addLayer({
        id: "accuracy-circle-layer",
        type: "circle",
        source: "accuracy-circle",
        paint: {
          "circle-radius": 60,
          "circle-color": "#0052FF",
          "circle-opacity": 0.15,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#0052FF",
          "circle-stroke-opacity": 0.4,
        },
      });

      accuracyCircleRef.current = "accuracy-circle";
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [baseLocation]);

  // helper: update accuracy circle size on map
  const updateAccuracyCircle = (
    coords: [number, number],
    accuracy: number
  ) => {
    const map = mapInstanceRef.current;
    if (!map || !map.getSource("accuracy-circle")) return;

    const source = map.getSource(
      "accuracy-circle"
    ) as mapboxgl.GeoJSONSource;

    source.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: coords,
      },
    });

    // shrink circle as accuracy improves
    const radius = Math.min(accuracy / 2, 80);
    map.setPaintProperty(
      "accuracy-circle-layer",
      "circle-radius",
      radius
    );
  };

  // STEP 3: Watch position until accurate
  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLoading(false);
      return;
    }

    setLoadingStage("searching");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        const accuracy = position.coords.accuracy;

        // move marker and camera on every update
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo({
            center: coords,
            zoom: 17,
            speed: 1.1,
          });
        }

        if (markerRef.current) {
          markerRef.current.setLngLat(coords);
        }

        updateAccuracyCircle(coords, accuracy);

        if (accuracy > 100) {
          // still refining
          setLoadingStage("improving");
          setUserLocation(coords);
          setIsLoading(false);
        } else {
          // accurate enough, stop watching
          setLoadingStage("done");
          setUserLocation(coords);
          setIsLoading(false);

          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(
              watchIdRef.current
            );
          }
        }
      },
      (error) => {
        console.log("GPS error:", error);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // loading message based on stage
  const loadingMessage = {
    booting: "Loading map...",
    searching: "Getting rough location...",
    improving: "Improving accuracy...",
    done: "Location found",
  }[loadingStage];

  // retry handler
  const retryLocation = () => {
    setIsLoading(true);
    setLoadingStage("searching");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        const accuracy = position.coords.accuracy;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo({
            center: coords,
            zoom: 17,
            speed: 1.1,
          });
        }

        if (markerRef.current) {
          markerRef.current.setLngLat(coords);
        }

        updateAccuracyCircle(coords, accuracy);

        if (accuracy > 100) {
          setLoadingStage("improving");
          setUserLocation(coords);
          setIsLoading(false);
        } else {
          setLoadingStage("done");
          setUserLocation(coords);
          setIsLoading(false);
          navigator.geolocation.clearWatch(watchId);
        }
      },
      (error) => {
        console.log(error);
        setIsLoading(false);
      },
      { enableHighAccuracy: true }
    );

    watchIdRef.current = watchId;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f5f5f7]">
      <div ref={mapRef} className="w-full h-full" />

      {/* loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-[#f5f5f7]/90 backdrop-blur-md flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-7 h-7 rounded-full border-2 border-black/10 border-t-black animate-spin" />
            <p className="text-sm font-medium text-black/60 tracking-tight">
              {loadingMessage}
            </p>
          </div>
        </div>
      )}

      {/* improving accuracy banner */}
      {!isLoading && loadingStage === "improving" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-md border border-black/5">
          <p className="text-xs font-medium text-black/60 tracking-tight">
            📍 Improving accuracy...
          </p>
        </div>
      )}

      {/* GPS failed overlay */}
      {!isLoading && !userLocation && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-md">
          <div className="w-[340px] rounded-3xl bg-white border border-black/5 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-black tracking-tight">
              Location unavailable
            </h2>
            <p className="mt-2 text-sm text-black/60 leading-relaxed">
              Could not access your GPS location. Please allow location access and try again.
            </p>
            <button
              onClick={retryLocation}
              className="mt-6 w-full h-12 rounded-2xl bg-black text-white text-sm font-semibold active:scale-[0.98] transition"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}