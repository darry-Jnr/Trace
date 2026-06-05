"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import {
  Map,
  Mountain,
  Plus,
  Type,
  Image as ImageIcon,
  Mic,
  X,
  MapPin,
  Calendar,
  Compass
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

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

export default function TraceWorkspacePage() {
  const router = useRouter();
  const toast = useToast();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const pathCoordsRef = useRef<[number, number][]>([]);
  const isRecordingRef = useRef(false);
  const userLocationRef = useRef<[number, number] | null>(null);

  const [baseLocation, setBaseLocation] = useState<[number, number] | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("booting");
  const [viewMode, setViewMode] = useState<ViewMode>("flat");

  const [isRecording, setIsRecording] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [mediaModal, setMediaModal] = useState<MediaModalType>(null);
  const [mediaInputText, setMediaInputText] = useState("");
  const [savedMedia, setSavedMedia] = useState<WaypointMedia[]>([]);
  
  // Save flow review states
  const [showSaveReview, setShowSaveReview] = useState(false);
  const [traceTitleInput, setTraceTitleInput] = useState("Unfinished Trail Trace");

  useEffect(() => {
    isRecordingRef.current = isRecording;
    if (!isRecording) setIsAddMenuOpen(false);
  }, [isRecording]);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // Bootstrap position
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

  // Mapbox Canvas Instance Build with Streets-v12 Real World Layers
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
      // Atmospheric fog configuration tailored for streets-v12 pastel horizons
      map.setFog({
        color: "rgb(230, 240, 255)",        // Soft sky blue horizon tint
        "high-color": "rgb(255, 255, 255)", // Crisp clean space blend
        "horizon-blend": 0.03,              // Smooth gradient feathering
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
        paint: { 
          "line-color": "#0052FF", // High-visibility premium tracking blue route vector line
          "line-width": 5.5, 
          "line-opacity": 0.95 
        },
      });
    });

    // Custom brand pin anchor highlighting active telemetry position
    const el = document.createElement("div");
    el.className = "w-5 h-5 rounded-full bg-[#0052FF] border-4 border-white shadow-[0_2px_10px_rgba(0,82,255,0.4)] flex items-center justify-center relative";
    // Wave pulse visual context indicator
    el.innerHTML = `<span class="absolute inset-0 rounded-full bg-[#0052FF]/30 animate-ping scale-150 pointer-events-none" style="animation-duration: 2s;" />`;

    const userMarker = new mapboxgl.Marker({ element: el })
      .setLngLat(baseLocation)
      .addTo(map);

    mapInstanceRef.current = map;
    userMarkerRef.current = userMarker;

    return () => {
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

  // GPS background telemetry watch loop
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
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
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
    customMediaEl.className = "w-8 h-8 rounded-[10px] bg-[#0052FF] text-white border-2 border-white shadow-[0_4px_12px_rgba(0,82,255,0.25)] flex items-center justify-center cursor-pointer transform transition-transform active:scale-95";
    
    let innerIcon = "Txt";
    if (mediaModal === "image") innerIcon = "Img";
    if (mediaModal === "voice") innerIcon = "Voc";
    customMediaEl.innerHTML = `<span class="text-[10px] font-bold tracking-tight">${innerIcon}</span>`;

    new mapboxgl.Marker({ element: customMediaEl })
      .setLngLat(placementCoords)
      .setPopup(
        new mapboxgl.Popup({ offset: 14, closeButton: false })
          .setHTML(`<p class="px-2.5 py-1.5 text-xs text-black font-semibold tracking-tight">${newMedia.content}</p>`)
      )
      .addTo(mapInstanceRef.current);

    setMediaInputText("");
    setMediaModal(null);
    setIsAddMenuOpen(false);
  };

  // Triggers the full-screen review canvas on tracking completion
  const handleStopRecordingFlow = () => {
    setIsRecording(false);
    setShowSaveReview(true);
  };

  // Pushes success toast alert, routes back to home dashboard workspace
  const handleCommitSaveTrace = () => {
    setShowSaveReview(false);
    toast.success("Trace Saved Successfully", `"${traceTitleInput}" has been safely archived in your dashboard workspace.`);
    router.push("/dashboard");
  };

  const loadingMessage = {
    booting: "Preparing workspace",
    searching: "Finding nearby position",
    improving: "Improving GPS accuracy",
    done: "Location connected",
  }[loadingStage];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f5f5f7] font-sans selection:bg-black selection:text-white">
      {/* Mapbox Canvas Surface Viewport */}
      <div ref={mapRef} className="w-full h-full z-0" />

      {/* Control Deck Overlay Panel */}
      {!isLoading && userLocation && (
        <div className="absolute right-5 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 items-center">
          
          {/* View Mode Node Toggle */}
          <button
            onClick={toggleView}
            className="w-14 h-14 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl border border-black/[0.04] rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] active:scale-[0.96] transition-all group"
          >
            {viewMode === "flat" ? (
              <Mountain className="w-[18px] h-[18px] text-black/70 group-hover:text-black transition-colors" />
            ) : (
              <Map className="w-[18px] h-[18px] text-black/70 group-hover:text-black transition-colors" />
            )}
            <span className="text-[9px] font-bold tracking-tight uppercase text-black/40 mt-1">
              {viewMode === "flat" ? "3D" : "2D"}
            </span>
          </button>

          {/* Core Recording Stream Action Trigger */}
          <button
            onClick={isRecording ? handleStopRecordingFlow : () => setIsRecording(true)}
            className={`w-14 h-14 flex flex-col items-center justify-center rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] active:scale-[0.96] transition-all ${
              isRecording 
                ? "bg-black text-white" 
                : "bg-white border border-black/[0.04] text-[#0052FF]"
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? "bg-white animate-pulse" : "bg-[#0052FF]"}`} />
            <span className={`text-[9px] font-bold tracking-tight uppercase mt-1.5 ${isRecording ? "text-white/60" : "text-black/50"}`}>
              {isRecording ? "Stop" : "Start"}
            </span>
          </button>

          {/* Layer Asset Deployment Node Cluster Drawer */}
          {isRecording && (
            <div className="flex flex-col gap-2 items-center mt-2 pt-2 border-t border-black/[0.05]">
              <button
                onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                className={`w-12 h-12 rounded-[16px] flex items-center justify-center shadow-sm transition-all active:scale-95 ${
                  isAddMenuOpen 
                    ? "bg-black text-white rotate-45" 
                    : "bg-white border border-black/[0.04] text-black/60 hover:text-black"
                }`}
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Nested Drawer Triggers */}
              {isAddMenuOpen && (
                <div className="flex flex-col gap-2 p-1.5 bg-white/95 backdrop-blur-xl rounded-[18px] border border-black/[0.04] shadow-md animate-fade-in-up">
                  <button 
                    onClick={() => setMediaModal("text")} 
                    className="w-9 h-9 rounded-[12px] bg-black/[0.03] hover:bg-[#0052FF] hover:text-white flex items-center justify-center text-black/70 transition-all active:scale-95"
                    title="Add Text Note"
                  >
                    <Type className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setMediaModal("image")} 
                    className="w-9 h-9 rounded-[12px] bg-black/[0.03] hover:bg-[#0052FF] hover:text-white flex items-center justify-center text-black/70 transition-all active:scale-95"
                    title="Attach Photo"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setMediaModal("voice")} 
                    className="w-9 h-9 rounded-[12px] bg-black/[0.03] hover:bg-[#0052FF] hover:text-white flex items-center justify-center text-black/70 transition-all active:scale-95"
                    title="Record Audio"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Media Input Drawer Submodal */}
      {mediaModal && (
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[26px] border border-black/[0.04] shadow-[0_24px_60px_rgba(0,0,0,0.08)] p-6 w-full max-w-sm relative animate-scale-up">
            <button 
              onClick={() => setMediaModal(null)} 
              className="absolute top-4 right-4 text-black/30 hover:text-black w-6 h-6 flex items-center justify-center rounded-full bg-black/[0.03]"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            
            <h3 className="text-sm font-semibold tracking-tight text-black capitalize mb-4 flex items-center gap-2">
              {mediaModal === "text" && <Type className="w-4 h-4 text-[#0052FF]" />}
              {mediaModal === "image" && <ImageIcon className="w-4 h-4 text-[#0052FF]" />}
              {mediaModal === "voice" && <Mic className="w-4 h-4 text-[#0052FF]" />}
              Attach {mediaModal} Point
            </h3>

            {mediaModal === "text" ? (
              <textarea
                value={mediaInputText}
                onChange={(e) => setMediaInputText(e.target.value)}
                placeholder="Leave context directions at this exact moment..."
                className="w-full h-24 p-3.5 bg-black/[0.02] border border-black/10 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0052FF] text-black resize-none tracking-tight leading-normal"
              />
            ) : (
              <div className="p-8 border border-dashed border-black/10 rounded-xl bg-black/[0.01] flex flex-col items-center justify-center text-center">
                <p className="text-xs font-semibold text-black/60 tracking-tight">Hardware device telemetry stream ready</p>
                <p className="text-[11px] font-medium text-black/35 mt-0.5 tracking-tight">Ready for {mediaModal} stream sync injection</p>
              </div>
            )}

            <button 
              onClick={handleSaveMediaMarker} 
              className="mt-4 w-full h-11 rounded-[14px] bg-black text-white text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Pin onto Line Trail
            </button>
          </div>
        </div>
      )}

      {/* Premium Full-Screen Trace Review Canvas (Triggered on Session Stop) */}
      {showSaveReview && (
        <div className="absolute inset-0 bg-[#f5f5f7] z-50 flex flex-col animate-slide-up select-none">
          
          {/* Header Action Row Bar */}
          <header className="h-20 w-full px-6 flex items-center justify-between bg-white border-b border-black/[0.04]">
            <button 
              onClick={() => setShowSaveReview(false)}
              className="w-10 h-10 rounded-[12px] bg-black/[0.03] hover:bg-black/[0.06] text-black/70 flex items-center justify-center transition-all active:scale-95"
              aria-label="Close review"
            >
              <X className="w-[18px] h-[18px] stroke-[2.5]" />
            </button>
            <span className="text-xs font-bold uppercase tracking-widest text-black/40">
              Review Map Trace
            </span>
            <div className="w-10 h-10 opacity-0 pointer-events-none" /> {/* Alignment Spacer */}
          </header>

          {/* Full Screen Interactive Snapshot Panel Layout Box */}
          <div className="flex-1 max-w-md w-full mx-auto px-6 flex flex-col justify-center gap-8 py-10">
            
            {/* Synthetic Vector Map Snapshot Graphic Frame Component */}
            <div className="w-full aspect-[4/3] bg-white rounded-[28px] border border-black/[0.04] shadow-[0_12px_40px_rgba(0,0,0,0.02)] relative overflow-hidden flex items-center justify-center p-6 group">
              {/* Dot Grid Background representation */}
              <div className="absolute inset-0 bg-[radial-gradient(#0052FF_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.06]" />
              
              {/* Captured Route Track Line Art */}
              <svg className="w-48 h-24 text-black/[0.08]" viewBox="0 0 200 100" fill="none" stroke="currentColor" strokeWidth={4}>
                <path 
                  d="M 20 75 C 40 40, 80 90, 120 40 C 140 20, 160 50, 180 35" 
                  stroke="#0052FF" 
                  strokeLinecap="round" 
                  strokeWidth={4.5}
                />
                <g transform="translate(180, 35)">
                  <circle cx="0" cy="0" r="4" fill="#0052FF" />
                </g>
              </svg>

              {/* Waypoint count badge pins overview */}
              <div className="absolute bottom-4 left-4 flex gap-1.5">
                <span className="px-2 py-1 rounded-[8px] bg-black text-white text-[9px] font-bold tracking-tight">
                  {savedMedia.length} Waypoints
                </span>
                <span className="px-2 py-1 rounded-[8px] bg-black/[0.04] text-black/50 text-[9px] font-bold tracking-tight">
                  {pathCoordsRef.current.length > 0 ? "0.2 mi" : "0.0 mi"}
                </span>
              </div>
              <Compass className="absolute top-4 right-4 w-4 h-4 text-black/20" />
            </div>

            {/* Metatext Data Configuration Panel Details */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 block mb-1.5 px-1">
                  Trace Identifier Title
                </label>
                <input 
                  type="text"
                  value={traceTitleInput}
                  onChange={(e) => setTraceTitleInput(e.target.value)}
                  className="w-full h-12 px-4 bg-white border border-black/10 rounded-[16px] text-sm font-semibold text-black focus:outline-none focus:border-[#0052FF] shadow-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-white border border-black/[0.03] p-3.5 rounded-[16px] flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[#0052FF] shrink-0" />
                  <div className="leading-none">
                    <span className="text-[9px] font-bold text-black/35 block uppercase tracking-tight">Coordinates</span>
                    <span className="text-xs font-bold text-black block mt-0.5">Vector Set</span>
                  </div>
                </div>
                <div className="bg-white border border-black/[0.03] p-3.5 rounded-[16px] flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#0052FF] shrink-0" />
                  <div className="leading-none">
                    <span className="text-[9px] font-bold text-black/35 block uppercase tracking-tight">Timestamp</span>
                    <span className="text-xs font-bold text-black block mt-0.5">Just Now</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Save Action Button */}
            <button
              onClick={handleCommitSaveTrace}
              className="w-full h-12 rounded-[16px] bg-black text-white text-sm font-semibold tracking-tight shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center mt-2"
            >
              Save & Publish Trail Link
            </button>
          </div>
        </div>
      )}

      {/* Screen Initial Setup Setup Overlay Loader */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-[#f5f5f7] flex items-center justify-center select-none">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-[14px] bg-black flex items-center justify-center shadow-md animate-pulse">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white animate-spin" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="18" r="1.5" className="fill-white" />
                <path d="M6 18C6 12 18 12 18 6" />
                <circle cx="18" cy="6" r="1.5" className="fill-white" />
              </svg>
            </div>
            <div>
              <h2 className="text-[14px] font-semibold tracking-tight text-black">{loadingMessage}</h2>
              <p className="text-xs font-medium text-black/35 mt-0.5 tracking-tight">Syncing navigation environment...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}