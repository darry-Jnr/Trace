"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export default function Dashboard() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [baseLocation, setBaseLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // STEP 1: Fast IP-based location to boot the map
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

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [baseLocation]);

  // STEP 3: Get real GPS location
  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        setUserLocation(coords);
        setIsLoading(false);

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
  }, []);

  // Retry button handler
  const retryLocation = () => {
    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        setUserLocation(coords);
        setIsLoading(false);

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
      },
      (error) => {
        console.log(error);
        setIsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f5f5f7]">
      <div ref={mapRef} className="w-full h-full" />

      {isLoading && (
        <div className="absolute inset-0 z-50 bg-[#f5f5f7]/90 backdrop-blur-md flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-7 h-7 rounded-full border-2 border-black/10 border-t-black animate-spin" />
            <p className="text-sm font-medium text-black/60 tracking-tight">
              Finding your location...
            </p>
          </div>
        </div>
      )}

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