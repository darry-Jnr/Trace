"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import {
  Navigation,
  LoaderCircle,
  Map,
  Mountain,
  Radar,
  ArrowUp,
  CirclePlay,
  OctagonAlert,
  Mic,
  Image as ImageIcon,
  Type,
  X
} from "lucide-react";

import "mapbox-gl/dist/mapbox-gl.css";

type LoadingStage = "booting" | "searching" | "improving" | "done";
type ViewMode = "flat" | "tilted";
type MediaModalType = "text" | "image" | "voice" | null;

interface WaypointMedia {
  type: "text" | "image" | "voice";
  content: string;
  coordinates: [number, number];
}

const CACHE_KEY = "trace_last_known_location";

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

export default function Dashboard() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const junctionMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const pathCoordsRef = useRef<[number, number][]>([]);
  const isRecordingRef = useRef(false);
  const userLocationRef = useRef<[number, number] | null>(null);

  const [baseLocation, setBaseLocation] = useState<[number, number] | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("booting");
  const [viewMode, setViewMode] = useState<ViewMode>("flat");
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  const [turnAngle, setTurnAngle] = useState<number>(0);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaModal, setMediaModal] = useState<MediaModalType>(null);
  const [mediaInputText, setMediaInputText] = useState("");
  const [savedMedia, setSavedMedia] = useState<WaypointMedia[]>([]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // 1. BOOTSTRAP INITIAL COORDINATES SAFELY
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

  useEffect(() => {
    const markerElement = document.getElementById("junction-arrow-element");
    if (!markerElement) return;
    markerElement.style.transform = `rotate(${turnAngle}deg)`;
  }, [turnAngle]);

  // 2. LIFECYCLE SAFE MAPBOX INITIALIZATION (PREVENTS WEBGL CONTEXT LOSS)
  useEffect(() => {
    if (!baseLocation || !mapRef.current || mapInstanceRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

    let hasCache = false;
    try {
      if (localStorage.getItem(CACHE_KEY)) hasCache = true;
    } catch { }

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

      map.addSource("recording-trail-source", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        },
      });

      map.addLayer({
        id: "recording-trail-layer",
        type: "line",
        source: "recording-trail-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#0052FF", "line-width": 6, "line-opacity": 0.85 },
      });
    });

    const userMarker = new mapboxgl.Marker({ color: "#0052FF", scale: 1.1 })
      .setLngLat(baseLocation)
      .addTo(map);

    mapInstanceRef.current = map;
    userMarkerRef.current = userMarker;

    map.on("click", (e) => {
      const el = mapRef.current;
      if (el && el.getAttribute("data-placement") === "true") {
        if (junctionMarkerRef.current) junctionMarkerRef.current.remove();

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

        markerContainer.innerHTML = `
          <div id="junction-arrow-element" style="transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); transform: rotate(${turnAngle}deg); display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
          </div>
        `;

        const junctionMarker = new mapboxgl.Marker({ element: markerContainer, draggable: true })
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .addTo(map);

        junctionMarkerRef.current = junctionMarker;
        setIsPlacementMode(false);
      }
    });

    return () => {
      if (junctionMarkerRef.current) junctionMarkerRef.current.remove();
      if (userMarkerRef.current) userMarkerRef.current.remove();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [baseLocation]);

  useEffect(() => {
    if (isRecording && userLocation) {
      pathCoordsRef.current = [userLocation];
      updateMapTrailSource();
    }
  }, [isRecording]);

  const updateMapTrailSource = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const source = map.getSource("recording-trail-source") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: pathCoordsRef.current },
      });
    }
  };

  // 3. SECURE BACKGROUND GEOLOCATION WATCH DECK WITH TIMEOUT SAFETY NETS
  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLoading(false);
      return;
    }

    let hasCache = false;
    try {
      if (localStorage.getItem(CACHE_KEY)) hasCache = true;
    } catch { }

    if (!hasCache) setLoadingStage("searching");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        let rawLng = position.coords.longitude;
        let rawLat = position.coords.latitude;
        const accuracy = position.coords.accuracy;
        const heading = position.coords.heading;

        if (accuracy > 25 && isRecordingRef.current) return;

        setUserLocation((prevUserLocation) => {
          let finalCoords: [number, number] = [rawLng, rawLat];

          if (prevUserLocation) {
            finalCoords = [
              prevUserLocation[0] * 0.25 + rawLng * 0.75,
              prevUserLocation[1] * 0.25 + rawLat * 0.75,
            ];
          }

          const locationChanged =
            !prevUserLocation ||
            Math.abs(prevUserLocation[0] - finalCoords[0]) > 0.00003 ||
            Math.abs(prevUserLocation[1] - finalCoords[1]) > 0.00003;

          if (locationChanged && mapInstanceRef.current) {
            // CRITICAL FIX: Only rotate the map to heading if recording is true!
            // Otherwise, lock target bearing strictly to 0 (clean top-down north view)
            const targetBearing = (isRecordingRef.current && heading !== null && heading !== undefined)
              ? heading
              : 0;

            if (prevUserLocation) {
              mapInstanceRef.current.easeTo({
                center: finalCoords,
                zoom: 17,
                bearing: targetBearing,
                duration: 1100,
              });
            } else {
              mapInstanceRef.current.flyTo({
                center: finalCoords,
                zoom: 17,
                bearing: targetBearing,
                speed: 1.1,
                essential: true,
              });
            }
          }

          if (isRecordingRef.current) {
            const history = pathCoordsRef.current;
            if (history.length === 0) {
              pathCoordsRef.current = [finalCoords];
              updateMapTrailSource();
            } else {
              const lastSavedPoint = history[history.length - 1];
              const distanceMoved = getDistanceMeters(lastSavedPoint, finalCoords);

              if (distanceMoved > 3.5) {
                pathCoordsRef.current = [...history, finalCoords];
                updateMapTrailSource();
              }
            }
          }

          return finalCoords;
        });

        if (userMarkerRef.current && userLocationRef.current) {
          userMarkerRef.current.setLngLat(userLocationRef.current);
        }

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify([rawLng, rawLat]));
        } catch (e) { }

        setLoadingStage("done");
        setIsLoading(false);
      },
      (error) => {
        console.error("GPS stream alert:", error);
        // NON-BLOCKING CATCH-ALL: Prevents timeouts on laptops from completely bricking the UI
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // Safe baseline window
        maximumAge: 0,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const toggleView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (viewMode === "flat") {
      map.easeTo({ pitch: 65, bearing: 0, duration: 1200 });
      setViewMode("tilted");
    } else {
      map.easeTo({ pitch: 0, bearing: 0, duration: 1200 });
      setViewMode("flat");
    }
  };

  const stepClockRotation = () => {
    setTurnAngle((prevAngle) => (prevAngle + 45) % 360);
  };

  const handleSaveMediaMarker = () => {
    const placementCoords = userLocationRef.current;
    if (!placementCoords || !mapInstanceRef.current) return;

    const newMedia: WaypointMedia = {
      type: mediaModal!,
      content: mediaModal === "text" ? mediaInputText : `Hardware attached ${mediaModal} capture data`,
      coordinates: placementCoords,
    };

    setSavedMedia((prev) => [...prev, newMedia]);

    const customMediaEl = document.createElement("div");
    customMediaEl.className = "w-8 h-8 rounded-full bg-black text-white border-2 border-white shadow-lg flex items-center justify-center font-bold text-[10px] cursor-pointer transform transition-transform active:scale-95";
    customMediaEl.innerHTML = mediaModal === "text" ? "Txt" : mediaModal === "image" ? "Img" : "Voc";

    new mapboxgl.Marker({ element: customMediaEl })
      .setLngLat(placementCoords)
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<p class="p-2 text-xs text-black font-semibold">${newMedia.content}</p>`))
      .addTo(mapInstanceRef.current);

    setMediaInputText("");
    setMediaModal(null);
  };

  const loadingMessage = {
    booting: "Preparing workspace",
    searching: "Finding nearby position",
    improving: "Improving GPS accuracy",
    done: "Location connected",
  }[loadingStage];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f5f5f7]">
      <div ref={mapRef} data-placement={isPlacementMode} className="w-full h-full" />

      {!isLoading && userLocation && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
            <Radar className="w-4 h-4 text-[#0052FF]" />
            <p className="text-xs font-semibold tracking-tight text-black/70">GPS Connected</p>
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-red-500 text-white shadow-md animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white block animate-ping" />
              <p className="text-[11px] font-bold tracking-tight uppercase">Live Recording Active</p>
            </div>
          )}
        </div>
      )}

      {!isLoading && userLocation && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3">
          <button
            onClick={toggleView}
            className="w-14 h-14 flex flex-col items-center justify-center p-0 gap-1 sm:w-auto sm:h-14 sm:flex-row sm:px-5 sm:gap-3 rounded-2xl bg-white/92 backdrop-blur-2xl border border-black/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.08)] whitespace-nowrap active:scale-[0.98] transition-all"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0052FF]/10 flex items-center justify-center shrink-0">
              {viewMode === "flat" ? <Mountain className="w-4 h-4 text-[#0052FF]" /> : <Map className="w-4 h-4 text-[#0052FF]" />}
            </div>
            <div className="flex flex-col items-center sm:items-start leading-none">
              <span className="text-[8px] sm:text-[10px] font-medium text-black/35 uppercase tracking-wider">View</span>
              <span className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm font-semibold tracking-tight text-black">{viewMode === "flat" ? "3D" : "2D"}</span>
            </div>
          </button>

          <button
            onClick={() => setIsPlacementMode(!isPlacementMode)}
            className={`w-14 h-14 flex flex-col items-center justify-center p-0 gap-1 sm:w-auto sm:h-14 sm:flex-row sm:px-5 sm:gap-3 rounded-2xl border shadow-[0_10px_40px_rgba(0,0,0,0.08)] backdrop-blur-2xl whitespace-nowrap active:scale-[0.98] transition-all ${isPlacementMode ? "bg-[#0052FF] border-[#0052FF] text-white" : "bg-white/92 border-black/[0.06] text-black"
              }`}
          >
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${isPlacementMode ? "bg-white/20" : "bg-[#0052FF]/10"}`}>
              <Navigation className={`w-4 h-4 ${isPlacementMode ? "text-white" : "text-[#0052FF]"}`} />
            </div>
            <div className="flex flex-col items-center sm:items-start leading-none">
              <span className={`text-[8px] sm:text-[10px] font-medium uppercase tracking-wider ${isPlacementMode ? "text-white/60" : "text-black/35"}`}>Junction</span>
              <span className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm font-semibold tracking-tight">{isPlacementMode ? "Active" : "Place"}</span>
            </div>
          </button>

          {junctionMarkerRef.current && (
            <button
              onClick={stepClockRotation}
              className="w-14 h-14 flex flex-col items-center justify-center p-0 gap-1 sm:w-auto sm:h-14 sm:flex-row sm:px-5 sm:gap-3 rounded-2xl bg-white/92 border border-black/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.08)] backdrop-blur-2xl whitespace-nowrap active:scale-[0.98] transition-all text-black"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0052FF]/10 flex items-center justify-center shrink-0">
                <ArrowUp className="w-4 h-4 text-[#0052FF]" />
              </div>
              <div className="flex flex-col items-center sm:items-start leading-none">
                <span className="text-[8px] sm:text-[10px] font-medium text-black/35 uppercase tracking-wider">Turn</span>
                <span className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm font-semibold tracking-tight text-black">{turnAngle}°</span>
              </div>
            </button>
          )}

          {junctionMarkerRef.current && (
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`w-14 h-14 flex flex-col items-center justify-center p-0 gap-1 sm:w-auto sm:h-14 sm:flex-row sm:px-5 sm:gap-3 rounded-2xl border shadow-[0_10px_40px_rgba(0,0,0,0.08)] backdrop-blur-2xl whitespace-nowrap active:scale-[0.98] transition-all ${isRecording ? "bg-red-500 border-red-500 text-white animate-pulse" : "bg-white border-black/[0.06] text-black"
                }`}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0">
                {isRecording ? <OctagonAlert className="w-4 h-4 text-white" /> : <CirclePlay className="w-4 h-4 text-red-500" />}
              </div>
              <div className="flex flex-col items-center sm:items-start leading-none">
                <span className={`text-[8px] sm:text-[10px] font-medium uppercase tracking-wider ${isRecording ? "text-white/60" : "text-black/35"}`}>Record</span>
                <span className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm font-semibold tracking-tight">{isRecording ? "Stop" : "Start"}</span>
              </div>
            </button>
          )}

          {isRecording && (
            <div className="mt-4 p-2 bg-black/90 backdrop-blur-2xl rounded-2xl border border-white/10 flex flex-col gap-2 items-center shadow-2xl">
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 pb-1 border-b border-white/10 w-full text-center">Add</span>
              <button onClick={() => setMediaModal("text")} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                <Type className="w-4 h-4" />
              </button>
              <button onClick={() => setMediaModal("image")} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                <ImageIcon className="w-4 h-4" />
              </button>
              <button onClick={() => setMediaModal("voice")} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                <Mic className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {mediaModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-2xl p-6 w-full max-w-sm relative">
            <button onClick={() => setMediaModal(null)} className="absolute top-4 right-4 text-black/40 hover:text-black">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold tracking-tight text-black capitalize mb-4 flex items-center gap-2">
              {mediaModal === "text" && <Type className="w-5 h-5 text-[#0052FF]" />}
              {mediaModal === "image" && <ImageIcon className="w-5 h-5 text-[#0052FF]" />}
              {mediaModal === "voice" && <Mic className="w-5 h-5 text-[#0052FF]" />}
              Attach {mediaModal} Waypoint
            </h3>
            {mediaModal === "text" ? (
              <textarea
                value={mediaInputText}
                onChange={(e) => setMediaInputText(e.target.value)}
                placeholder="Type routing instructions..."
                className="w-full h-24 p-3 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-[#0052FF] text-black resize-none"
              />
            ) : (
              <div className="p-8 border-2 border-dashed border-black/10 rounded-xl bg-black/[0.02] flex flex-col items-center justify-center text-center">
                <p className="text-xs font-semibold text-black/60">Capture active hardware simulation interface</p>
                <p className="text-[11px] text-black/40 mt-1">Ready for hardware stream pipeline injection</p>
              </div>
            )}
            <button onClick={handleSaveMediaMarker} className="mt-4 w-full h-11 rounded-xl bg-[#0052FF] hover:bg-[#003ECC] text-white text-sm font-semibold transition-all">
              Pin onto Line Trail
            </button>
          </div>
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
              <h2 className="text-[15px] font-semibold tracking-tight text-black">{loadingMessage}</h2>
              <p className="mt-1 text-sm text-black/45">Syncing navigation environment</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}