"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import {
  Navigation,
  LocateFixed,
  LoaderCircle,
  Map,
  Mountain,
  Radar,
  RefreshCcw,
  ArrowUp,
} from "lucide-react";

import "mapbox-gl/dist/mapbox-gl.css";

type LoadingStage = "booting" | "searching" | "improving" | "done";
type ViewMode = "flat" | "tilted";

const CACHE_KEY = "trace_last_known_location";

export default function Dashboard() {
  // ==================================================
  // REFS
  // ==================================================
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const junctionMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // ==================================================
  // STATE
  // ==================================================
  const [baseLocation, setBaseLocation] = useState<[number, number] | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("booting");
  const [viewMode, setViewMode] = useState<ViewMode>("flat");
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  
  // Clockwise rotation tracking state (0° to 315°)
  const [turnAngle, setTurnAngle] = useState<number>(0);

  // ==================================================
  // INITIAL BOOT DECK (CACHE DETECTOR)
  // ==================================================
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
          setBaseLocation([3.3792, 6.5244]); // Lagos fallback
        }
      } catch {
        setBaseLocation([3.3792, 6.5244]);
      }
    }
    prepareMap();
  }, []);

  // ==================================================
  // CLOCKWISE ROTATION TRACKER ENGINE
  // ==================================================
  useEffect(() => {
    const markerElement = document.getElementById("junction-arrow-element");
    if (!markerElement) return;

    // Direct geometric assignment for vector clock sweeps
    markerElement.style.transform = `rotate(${turnAngle}deg)`;
  }, [turnAngle]);

  // ==================================================
  // INITIALIZE MAPBOX & INTERACTIVE MARKERS
  // ==================================================
  useEffect(() => {
    if (!baseLocation || !mapRef.current || mapInstanceRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

    let hasCache = false;
    try {
      if (localStorage.getItem(CACHE_KEY)) hasCache = true;
    } catch {}

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: baseLocation,
      zoom: hasCache ? 17 : 14,
      pitch: 0,
      bearing: 0,
      antialias: true,
    });

    map.on("style.load", () => {
      map.setFog({
        color: "rgb(255,255,255)",
        "high-color": "rgb(245,245,247)",
        "horizon-blend": 0.02,
      });
    });

    const userMarker = new mapboxgl.Marker({
      color: "#0052FF",
      scale: 1.1,
    })
      .setLngLat(baseLocation)
      .addTo(map);

    mapInstanceRef.current = map;
    userMarkerRef.current = userMarker;

    map.on("click", (e) => {
      const el = mapRef.current;
      if (el && el.getAttribute("data-placement") === "true") {
        
        if (junctionMarkerRef.current) {
          junctionMarkerRef.current.remove();
        }

        const markerContainer = document.createElement("div");
        markerContainer.className = "cursor-grab active:cursor-grabbing";
        markerContainer.style.width = "44px";
        markerContainer.style.height = "44px";
        markerContainer.style.display = "flex";
        markerContainer.style.alignItems = "center";
        markerContainer.style.justifyContent = "center";
        markerContainer.style.backgroundColor = "#0052FF";
        markerContainer.style.borderRadius = "14px";
        markerContainer.style.boxShadow = "0 10px 25px rgba(0, 82, 255, 0.4)";
        markerContainer.style.border = "3px solid white";
        
        // Swapped ArrowUpRight out for ArrowUp to make 0° true north positioning clean
        markerContainer.innerHTML = `
          <div id="junction-arrow-element" style="transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); transform: rotate(${turnAngle}deg); display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
          </div>
        `;

        const junctionMarker = new mapboxgl.Marker({
          element: markerContainer,
          draggable: true, 
        })
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .addTo(map);

        junctionMarkerRef.current = junctionMarker;
        setIsPlacementMode(false);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      userMarkerRef.current = null;
      if (junctionMarkerRef.current) junctionMarkerRef.current.remove();
    };
  }, [baseLocation]);

  // ==================================================
  // PERMANENT BACKGROUND GEOLOCATION WATCH DECK
  // ==================================================
  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLoading(false);
      return;
    }

    let hasCache = false;
    try {
      if (localStorage.getItem(CACHE_KEY)) hasCache = true;
    } catch {}

    if (!hasCache) {
      setLoadingStage("searching");
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        const accuracy = position.coords.accuracy;

        setUserLocation((prevUserLocation) => {
          const locationChanged =
            !prevUserLocation ||
            Math.abs(prevUserLocation[0] - coords[0]) > 0.0001 ||
            Math.abs(prevUserLocation[1] - coords[1]) > 0.0001;

          if (locationChanged && mapInstanceRef.current) {
            if (prevUserLocation) {
              mapInstanceRef.current.easeTo({
                center: coords,
                zoom: 17,
                duration: 1500,
              });
            } else {
              mapInstanceRef.current.flyTo({
                center: coords,
                zoom: 17,
                speed: 1.1,
                essential: true,
              });
            }
          }
          return coords;
        });

        if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat(coords);
        }

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(coords));
        } catch (e) {}

        if (accuracy > 100) {
          if (!hasCache) setLoadingStage("improving");
          setIsLoading(false);
        } else {
          setLoadingStage("done");
          setIsLoading(false);
        }
      },
      (error) => {
        console.log("GPS error:", error);
        if (!hasCache) setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // ==================================================
  // VIEW MODE TRANSITIONS
  // ==================================================
  const toggleView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (viewMode === "flat") {
      map.easeTo({ pitch: 65, bearing: 15, duration: 1200 });
      setViewMode("tilted");
    } else {
      map.easeTo({ pitch: 0, bearing: 0, duration: 1200 });
      setViewMode("flat");
    }
  };

  const retryLocation = () => {
    setIsLoading(true);
    setLoadingStage("searching");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        setUserLocation(coords);
        setIsLoading(false);

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(coords));
        } catch (e) {}

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo({ center: coords, zoom: 17, speed: 1.1 });
        }
        if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat(coords);
        }
      },
      (error) => {
        console.log(error);
        setIsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // STEP CLOCK SYSTEM: Progresses clockwise in clean 45-degree chunks
  const stepClockRotation = () => {
    setTurnAngle((prevAngle) => (prevAngle + 45) % 360);
  };

  const loadingMessage = {
    booting: "Preparing workspace",
    searching: "Finding nearby position",
    improving: "Improving GPS accuracy",
    done: "Location connected",
  }[loadingStage];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f5f5f7]">
      <div
        ref={mapRef}
        data-placement={isPlacementMode}
        className="w-full h-full"
      />

      {!isLoading && userLocation && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
            <Radar className="w-4 h-4 text-[#0052FF]" />
            <p className="text-xs font-semibold tracking-tight text-black/70">
              GPS Connected
            </p>
          </div>
        </div>
      )}

      {!isLoading && userLocation && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3">
          
          <button
            onClick={toggleView}
            className="w-14 h-14 flex flex-col items-center justify-center p-0 gap-1 sm:w-auto sm:h-14 sm:flex-row sm:px-5 sm:gap-3 rounded-2xl bg-white/92 backdrop-blur-2xl border border-black/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.08)] whitespace-nowrap active:scale-[0.98] transition-all"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0052FF]/10 flex items-center justify-center shrink-0">
              {viewMode === "flat" ? (
                <Mountain className="w-4 h-4 text-[#0052FF]" />
              ) : (
                <Map className="w-4 h-4 text-[#0052FF]" />
              )}
            </div>
            <div className="flex flex-col items-center sm:items-start leading-none">
              <span className="text-[8px] sm:text-[10px] font-medium text-black/35 uppercase tracking-wider">
                View
              </span>
              <span className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm font-semibold tracking-tight text-black">
                {viewMode === "flat" ? "3D" : "2D"}
              </span>
            </div>
          </button>

          <button
            onClick={() => setIsPlacementMode(!isPlacementMode)}
            className={`w-14 h-14 flex flex-col items-center justify-center p-0 gap-1 sm:w-auto sm:h-14 sm:flex-row sm:px-5 sm:gap-3 rounded-2xl border shadow-[0_10px_40px_rgba(0,0,0,0.08)] backdrop-blur-2xl whitespace-nowrap active:scale-[0.98] transition-all ${
              isPlacementMode ? "bg-[#0052FF] border-[#0052FF] text-white" : "bg-white/92 border-black/[0.06] text-black"
            }`}
          >
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isPlacementMode ? "bg-white/20" : "bg-[#0052FF]/10"
            }`}>
              <Navigation className={`w-4 h-4 ${isPlacementMode ? "text-white" : "text-[#0052FF]"}`} />
            </div>
            <div className="flex flex-col items-center sm:items-start leading-none">
              <span className={`text-[8px] sm:text-[10px] font-medium uppercase tracking-wider ${
                isPlacementMode ? "text-white/60" : "text-black/35"
              }`}>
                Junction
              </span>
              <span className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm font-semibold tracking-tight">
                {isPlacementMode ? "Active" : "Place"}
              </span>
            </div>
          </button>

          {/* DYNAMIC TURN CONTROLLER: Cycles through angles in 45° steps */}
          {junctionMarkerRef.current && (
            <button
              onClick={stepClockRotation}
              className="w-14 h-14 flex flex-col items-center justify-center p-0 gap-1 sm:w-auto sm:h-14 sm:flex-row sm:px-5 sm:gap-3 rounded-2xl bg-white/92 border border-black/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.08)] backdrop-blur-2xl whitespace-nowrap active:scale-[0.98] transition-all text-black"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0052FF]/10 flex items-center justify-center shrink-0">
                <ArrowUp className="w-4 h-4 text-[#0052FF]" />
              </div>
              <div className="flex flex-col items-center sm:items-start leading-none">
                <span className="text-[8px] sm:text-[10px] font-medium text-black/35 uppercase tracking-wider">
                  Turn
                </span>
                <span className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm font-semibold tracking-tight text-black">
                  {turnAngle}°
                </span>
              </div>
            </button>
          )}

        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-50 bg-[#f5f5f7]/80 backdrop-blur-xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#0052FF]/10 blur-2xl scale-150" />
              <div className="relative w-16 h-16 rounded-3xl bg-white border border-black/[0.06] shadow-[0_20px_60px_rgba(0,0,0,0.08)] flex items-center justify-center">
                <LoaderCircle className="w-7 h-7 text-[#0052FF] animate-spin" />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <h2 className="text-[15px] font-semibold tracking-tight text-black">
                {loadingMessage}
              </h2>
              <p className="mt-1 text-sm text-black/45">
                Syncing navigation environment
              </p>
            </div>
          </div>
        </div>
      )}

      {!isLoading && loadingStage === "improving" && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
            <LocateFixed className="w-4 h-4 text-[#0052FF] animate-pulse" />
            <p className="text-xs font-semibold tracking-tight text-black/70">
              Improving accuracy
            </p>
          </div>
        </div>
      )}

      {!isLoading && !userLocation && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-[360px] rounded-[32px] bg-white border border-black/[0.06] shadow-[0_30px_80px_rgba(0,0,0,0.12)] p-6">
            <div className="w-14 h-14 rounded-2xl bg-[#0052FF]/10 flex items-center justify-center">
              <Navigation className="w-6 h-6 text-[#0052FF]" />
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-tight text-black">
              Location unavailable
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-black/55">
              Trace could not access your GPS location. Please allow location permissions and try again.
            </p>
            <button
              onClick={retryLocation}
              className="mt-6 w-full h-12 rounded-2xl bg-black text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <RefreshCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}