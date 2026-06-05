"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import {
  Map,
  Mountain,
  Plus,
  MessageSquareMore,
  Camera,
  AudioWaveform,
  X,
  Play
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import SaveReviewModal from "./components/SaveReviewModal";

import "mapbox-gl/dist/mapbox-gl.css";

type LoadingStage = "booting" | "searching" | "improving" | "done";
type ViewMode = "flat" | "tilted";
type MediaModalType = "text" | "image" | "voice" | null;

interface WaypointMedia {
  id: string;
  type: "text" | "image" | "voice";
  content: string;
  category: string;
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
  
  // Track currently active inspected waypoint card popping up from below
  const [activeWaypoint, setActiveWaypoint] = useState<WaypointMedia | null>(null);
  
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

  // Mapbox Canvas Instance Build
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
      attributionControl: false, // REMOVES THE ATTRIBUTION INFO FROM THE BOTTOM
    });

    map.on("style.load", () => {
      map.setFog({
        color: "rgb(230, 240, 255)",
        "high-color": "rgb(255, 255, 255)",
        "horizon-blend": 0.03,
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
          "line-color": "#0052FF",
          "line-width": 5.5, 
          "line-opacity": 0.95 
        },
      });
    });

    const el = document.createElement("div");
    el.className = "w-5 h-5 rounded-full bg-[#0052FF] border-4 border-white shadow-[0_2px_10px_rgba(0,82,255,0.4)] flex items-center justify-center relative";
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

    const categoryMapping = {
      text: "HELPING GUESTS FIND YOUR HOUSE",
      image: "RUNNING WITH FRIENDS",
      voice: "FINDING FRIENDS IN A CROWD"
    };

    const newMediaId = `wp-${Date.now()}`;
    const newMedia: WaypointMedia = {
      id: newMediaId,
      type: mediaModal!,
      content: mediaModal === "text" ? mediaInputText : mediaModal === "voice" ? `"I'm near the left speaker tower. Walk straight past the food stands."` : "Construction ahead. Cross to the right side of the street here.",
      category: categoryMapping[mediaModal!],
      coordinates: placementCoords,
    };

    setSavedMedia((prev) => [...prev, newMedia]);

    const customMediaEl = document.createElement("div");
    customMediaEl.className = "w-8 h-8 rounded-[10px] bg-black text-white border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] flex items-center justify-center cursor-pointer transform transition-transform active:scale-95 z-30";
    
    let innerIconHtml = '';
    if (mediaModal === "text") {
      innerIconHtml = `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
    } else if (mediaModal === "image") {
      innerIconHtml = `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`;
    } else if (mediaModal === "voice") {
      innerIconHtml = `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>`;
    }

    customMediaEl.innerHTML = innerIconHtml;

    customMediaEl.addEventListener("click", (e) => {
      e.stopPropagation();
      setActiveWaypoint(newMedia);
      mapInstanceRef.current?.easeTo({
        center: placementCoords,
        duration: 600
      });
    });

    new mapboxgl.Marker({ element: customMediaEl })
      .setLngLat(placementCoords)
      .addTo(mapInstanceRef.current);

    setMediaInputText("");
    setMediaModal(null);
    setIsAddMenuOpen(false);
  };

  const handleStopRecordingFlow = () => {
    setIsRecording(false);
    setShowSaveReview(true);
  };

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
    <div className="relative flex w-screen h-screen overflow-hidden bg-[#f5f5f7] font-sans selection:bg-black selection:text-white">
      {/* Map Section - Targets mapbox defaults cleanly via deep utility styling hidden state */}
      <div className="relative flex-1 h-full min-w-0 transition-all duration-300 z-0 [&_.mapboxgl-ctrl-logo]:hidden [&_.mapboxgl-ctrl-attrib]:hidden">
        <div ref={mapRef} className="w-full h-full" onClick={() => setActiveWaypoint(null)} />

      {/* Waypoint Sheet - Pops Up From Below */}
      {activeWaypoint && (
        <div className="absolute inset-x-0 bottom-0 z-50 flex justify-center p-4 md:pb-6 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-xl w-full md:max-w-md rounded-[28px] border border-black/[0.04] shadow-[0_-10px_40px_rgba(0,0,0,0.06),0_20px_50px_rgba(0,0,0,0.1)] p-6 relative pointer-events-auto animate-slide-up-sheet overflow-hidden">
            
            {/* Cancel/Close Button Top Right */}
            <button 
              onClick={() => setActiveWaypoint(null)} 
              className="absolute top-4 right-4 text-black/30 hover:text-black w-6 h-6 flex items-center justify-center rounded-full bg-black/[0.03] transition-colors"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            {/* Sub-Header Designation */}
            <span className="text-[10px] font-bold tracking-wider text-black/40 uppercase block mb-2.5">
              {activeWaypoint.category}
            </span>

            {/* Dynamic Layout Content Render blocks */}
            {activeWaypoint.type === "text" && (
              <div className="bg-black/[0.01] border border-black/[0.04] rounded-[16px] p-4">
                <p className="text-sm font-medium text-black/80 tracking-tight leading-relaxed">
                  {activeWaypoint.content}
                </p>
              </div>
            )}

            {activeWaypoint.type === "image" && (
              <div className="space-y-3.5">
                <div className="w-full aspect-[16/10] bg-black/[0.03] border border-black/[0.05] rounded-[20px] flex flex-col items-center justify-center text-black/20">
                  <Camera className="w-8 h-8 stroke-[1.5] mb-1" />
                  <span className="text-[10px] font-semibold tracking-tight text-black/35">Asset Snapshot Layer</span>
                </div>
                <p className="text-sm font-medium text-black/80 tracking-tight px-0.5">
                  {activeWaypoint.content}
                </p>
              </div>
            )}

            {activeWaypoint.type === "voice" && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-black/80 italic tracking-tight leading-relaxed">
                  {activeWaypoint.content}
                </p>
                <div className="flex items-center gap-3 bg-black/[0.02] border border-black/[0.04] rounded-[18px] p-3">
                  <button className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform shrink-0">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </button>
                  <div className="flex items-center gap-[3px] h-6 flex-1 opacity-25">
                    {[2, 4, 3, 6, 2, 5, 4, 7, 3, 5, 2, 6, 4, 3, 5, 2, 4, 3, 5, 2, 4].map((val, i) => (
                      <div 
                        key={i} 
                        className="bg-black rounded-full flex-1" 
                        style={{ height: `${val * 12}%` }} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Control Deck Overlay Panel */}
      {!isLoading && userLocation && (
        <div className="absolute right-5 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 items-center">
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

              {isAddMenuOpen && (
                <div className="flex flex-col gap-2 p-1.5 bg-white/95 backdrop-blur-xl rounded-[18px] border border-black/[0.04] shadow-md animate-fade-in-up">
                  <button 
                    onClick={() => setMediaModal("text")} 
                    className="w-9 h-9 rounded-[12px] bg-black/[0.03] hover:bg-[#0052FF] hover:text-white flex items-center justify-center text-black/70 transition-all active:scale-95"
                    title="Add Text Note"
                  >
                    <MessageSquareMore className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setMediaModal("image")} 
                    className="w-9 h-9 rounded-[12px] bg-black/[0.03] hover:bg-[#0052FF] hover:text-white flex items-center justify-center text-black/70 transition-all active:scale-95"
                    title="Attach Photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setMediaModal("voice")} 
                    className="w-9 h-9 rounded-[12px] bg-black/[0.03] hover:bg-[#0052FF] hover:text-white flex items-center justify-center text-black/70 transition-all active:scale-95"
                    title="Record Audio"
                  >
                    <AudioWaveform className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Media Input Drawer Submodal */}
      {mediaModal && (
        <div className="absolute inset-0 bg-black/15 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 transition-all duration-300">
          <div className="bg-white w-full md:max-w-sm rounded-t-[32px] md:rounded-[28px] border-t md:border border-black/[0.04] shadow-[0_-8px_30px_rgba(0,0,0,0.06),0_24px_60px_rgba(0,0,0,0.08)] p-6 pb-10 md:pb-6 relative animate-slide-up-sheet md:animate-scale-up-modal overflow-hidden">
            <button 
              onClick={() => setMediaModal(null)} 
              className="absolute top-4 right-4 text-black/30 hover:text-black w-6 h-6 flex items-center justify-center rounded-full bg-black/[0.03]"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            
            <h3 className="text-sm font-semibold tracking-tight text-black capitalize mb-4 flex items-center gap-2">
              {mediaModal === "text" && <MessageSquareMore className="w-4 h-4 text-[#0052FF]" />}
              {mediaModal === "image" && <Camera className="w-4 h-4 text-[#0052FF]" />}
              {mediaModal === "voice" && <AudioWaveform className="w-4 h-4 text-[#0052FF]" />}
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

      </div>

      {/* Premium Full-Screen Trace Review Canvas */}
      <SaveReviewModal
        isOpen={showSaveReview}
        onClose={() => setShowSaveReview(false)}
        title={traceTitleInput}
        onTitleChange={setTraceTitleInput}
        waypointCount={savedMedia.length}
        distance={pathCoordsRef.current.length > 0 ? "0.2 mi" : "0.0 mi"}
        onSave={handleCommitSaveTrace}
      />

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