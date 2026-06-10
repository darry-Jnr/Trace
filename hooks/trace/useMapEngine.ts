"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { ViewMode, WaypointMedia, CACHE_KEY } from "@/types";

export function useMapEngine(
  mapRef: React.RefObject<HTMLDivElement | null>,
  baseLocation: [number, number] | null,
  onWaypointSelect: (waypoint: WaypointMedia) => void,
  trailCoordinates: [number, number][] = [],
  savedMedia: WaypointMedia[] = [],
  isRecording: boolean = false,
  isReplayMode: boolean = false,
  isSynced: boolean = false,
  isFollowing: boolean = false,
  unlockedWaypointIds: Set<string> = new Set(),
  progressCoords: [number, number][] = []
) {
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const injectedMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [viewMode, setViewMode] = useState<ViewMode>("flat");
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mount Instance Mapbox Canvas
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
      attributionControl: false,
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
        paint: { "line-color": "#0052FF", "line-width": 5.5, "line-opacity": 0.95 },
      });
    });

    // User marker (default blue)
    const el = document.createElement("div");
    el.className = "w-5 h-5 rounded-full bg-[#0052FF] border-4 border-white shadow-[0_2px_10px_rgba(0,82,255,0.4)] flex items-center justify-center relative";
    el.innerHTML = `<span class="absolute inset-0 rounded-full bg-[#0052FF]/30 animate-ping scale-150 pointer-events-none" style="animation-duration: 2s;" />`;

    const userMarker = new mapboxgl.Marker({ element: el }).setLngLat(baseLocation).addTo(map);

    mapInstanceRef.current = map;
    userMarkerRef.current = userMarker;

    const markerCache = injectedMarkersRef.current;
    return () => {
      if (userMarkerRef.current) userMarkerRef.current.remove();
      removeReplayVisuals();
      map.remove();
      mapInstanceRef.current = null;
      markerCache.forEach((marker) => marker.remove());
      markerCache.clear();
    };
  }, [baseLocation, mapRef]);

  const trailCoordsRef = useRef(trailCoordinates);
  useEffect(() => { trailCoordsRef.current = trailCoordinates; }, [trailCoordinates]);
  const baseLocRef = useRef(baseLocation);
  useEffect(() => { baseLocRef.current = baseLocation; }, [baseLocation]);

  const addReplayVisuals = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const apply = () => {
      if (map.getSource("ghost-trail-source")) return;

      map.addSource("ghost-trail-source", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });

      map.addLayer({
        id: "ghost-trail-layer",
        type: "line",
        source: "ghost-trail-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#0052FF", "line-width": 5.5, "line-opacity": 0.3 },
      });

      map.addSource("progress-trail-source", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });

      map.addLayer({
        id: "progress-trail-layer",
        type: "line",
        source: "progress-trail-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#000000", "line-width": 5.5, "line-opacity": 0.9 },
      });

      const startEl = document.createElement("div");
      startEl.className = "flex flex-col items-center pointer-events-none";
      startEl.innerHTML = `
        <div class="w-5 h-5 rounded-full bg-[#0052FF] border-[3px] border-white shadow-[0_0_16px_rgba(0,82,255,0.6)]"></div>
        <span class="mt-1 px-2 py-0.5 rounded-full bg-black/80 text-white text-[10px] font-semibold tracking-tight backdrop-blur-sm">Start</span>
      `;
      const coords = trailCoordsRef.current;
      const startLoc = coords.length > 0 ? coords[0] : baseLocRef.current || [0, 0];
      const startMarker = new mapboxgl.Marker({ element: startEl }).setLngLat(startLoc).addTo(map);
      startMarkerRef.current = startMarker;
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("style.load", apply);
    }
  }, []);

  const removeReplayVisuals = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (map.getLayer("progress-trail-layer")) map.removeLayer("progress-trail-layer");
    if (map.getSource("progress-trail-source")) map.removeSource("progress-trail-source");
    if (map.getLayer("ghost-trail-layer")) map.removeLayer("ghost-trail-layer");
    if (map.getSource("ghost-trail-source")) map.removeSource("ghost-trail-source");

    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
  }, []);

  // Mount/unmount replay visuals when replay mode changes
  useEffect(() => {
    if (isReplayMode) {
      addReplayVisuals();
    } else {
      removeReplayVisuals();
    }
  }, [isReplayMode]);

  // Move start marker to trail start when trail loads in replay
  useEffect(() => {
    if (!isReplayMode || !startMarkerRef.current || trailCoordinates.length < 1) return;
    startMarkerRef.current.setLngLat(trailCoordinates[0]);
  }, [isReplayMode, trailCoordinates]);

  // Update ghost trail data
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isReplayMode || trailCoordinates.length < 2) return;

    const applyGhost = () => {
      const source = map.getSource("ghost-trail-source") as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: trailCoordinates },
        });
      }
    };

    if (map.isStyleLoaded()) {
      applyGhost();
    } else {
      map.once("style.load", applyGhost);
    }
  }, [isReplayMode, trailCoordinates]);

  // Update progress trail data (black covering)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isReplayMode || !isFollowing) return;

    const applyProgress = () => {
      const source = map.getSource("progress-trail-source") as mapboxgl.GeoJSONSource;
      if (source && progressCoords.length >= 2) {
        source.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: progressCoords },
        });
      }
    };

    if (map.isStyleLoaded()) {
      applyProgress();
    } else {
      map.once("style.load", applyProgress);
    }
  }, [isReplayMode, isFollowing, progressCoords]);

  // Update user marker appearance based on mode state
  useEffect(() => {
    const marker = userMarkerRef.current;
    if (!marker) return;

    const el = marker.getElement();
    if (isReplayMode) {
      if (isFollowing || isSynced) {
        // Black dot during following (or after sync)
        el.className = "w-5 h-5 rounded-full bg-black border-[3px] border-white shadow-[0_0_16px_rgba(0,0,0,0.5)] flex items-center justify-center relative";
        el.innerHTML = `
          <span class="absolute inset-0 rounded-full bg-black/30 animate-ping scale-[2] pointer-events-none" style="animation-duration: 1.5s;" />
        `;
      } else {
        // Green dot before sync
        el.className = "w-5 h-5 rounded-full bg-green-500 border-[3px] border-white shadow-[0_0_16px_rgba(34,197,94,0.5)] flex items-center justify-center relative";
        el.innerHTML = `
          <span class="absolute inset-0 rounded-full bg-green-500/30 animate-ping scale-[1.8] pointer-events-none" style="animation-duration: 2s;" />
        `;
      }
    } else if (isRecording) {
      el.className = "w-5 h-5 rounded-full bg-[#0052FF] border-[3px] border-white shadow-[0_0_20px_rgba(0,82,255,0.7),0_0_60px_rgba(0,82,255,0.3)] flex items-center justify-center relative";
      el.innerHTML = `
        <span class="absolute inset-0 rounded-full bg-[#0052FF]/40 animate-ping scale-[2] pointer-events-none" style="animation-duration: 1.2s;" />
        <span class="absolute inset-0 rounded-full bg-[#0052FF]/20 animate-ping scale-[3] pointer-events-none" style="animation-duration: 1.8s; animation-delay: 0.4s;" />
      `;
    } else {
      el.className = "w-5 h-5 rounded-full bg-[#0052FF] border-4 border-white shadow-[0_2px_10px_rgba(0,82,255,0.4)] flex items-center justify-center relative";
      el.innerHTML = `<span class="absolute inset-0 rounded-full bg-[#0052FF]/30 animate-ping scale-150 pointer-events-none" style="animation-duration: 2s;" />`;
    }
  }, [isReplayMode, isSynced, isFollowing, isRecording]);

  // Replay follow mode — heading-up, center on user, slower pan
  const clockFollowRef = useRef(false);
  useEffect(() => {
    if (isReplayMode && isFollowing) {
      clockFollowRef.current = true;
    } else {
      clockFollowRef.current = false;
    }
  }, [isReplayMode, isFollowing]);

  const handleLocationStream = (coords: [number, number], heading: number | null) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) userMarkerRef.current.setLngLat(coords);

    if (isReplayMode && isFollowing) {
      const targetBearing = heading !== null && heading !== undefined ? heading : map.getBearing();
      map.easeTo({ center: coords, zoom: 17, bearing: targetBearing, duration: 1500 });
    } else if (!isReplayMode) {
      const targetBearing = heading !== null && heading !== undefined ? heading : 0;
      map.easeTo({ center: coords, zoom: 17, bearing: targetBearing, duration: 1100 });
    }
  };

  // Update waypoint marker lock state
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isReplayMode) return;

    injectedMarkersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (unlockedWaypointIds.has(id)) {
        el.style.opacity = "1";
        el.style.filter = "none";
      } else {
        el.style.opacity = "0.35";
        el.style.filter = "grayscale(1)";
      }
    });
  }, [unlockedWaypointIds, isReplayMode]);

  const updateVectorPath = (coordinates: [number, number][]) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const source = map.getSource("recording-trail-source") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates },
      });
    }
  };

  const toggleViewPerspective = () => {
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

  const injectDOMMarker = (waypoint: WaypointMedia) => {
    const map = mapInstanceRef.current;
    if (!map) return null;

    const el = document.createElement("div");
    el.className = "w-8 h-8 rounded-[10px] bg-black text-white border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] flex items-center justify-center cursor-pointer transform transition-transform active:scale-95 z-30";
    if (isReplayMode) {
      el.style.opacity = "0.35";
      el.style.filter = "grayscale(1)";
    }

    const icons = {
      text: `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
      image: `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
      voice: `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>`
    };

    el.innerHTML = icons[waypoint.type];
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onWaypointSelect(waypoint);
      map.easeTo({ center: waypoint.coordinates, duration: 600 });
    });

    const marker = new mapboxgl.Marker({ element: el }).setLngLat(waypoint.coordinates).addTo(map);
    return marker;
  };

  // Sync vector path trail to Mapbox source layer automatically on updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || isReplayMode) return;

    const applyPath = () => {
      updateVectorPath(trailCoordinates);
    };

    if (map.isStyleLoaded()) {
      applyPath();
    } else {
      map.once("style.load", applyPath);
    }
  }, [trailCoordinates, isReplayMode]);

  const savedMediaRef = useRef(savedMedia);
  useEffect(() => {
    savedMediaRef.current = savedMedia;
  }, [savedMedia]);

  // Sync waypoint DOM markers to Mapbox map dynamically on updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const applyWaypoints = () => {
      const currentIds = new Set(savedMediaRef.current.map((wp) => wp.id));

      injectedMarkersRef.current.forEach((marker, id) => {
        if (!currentIds.has(id)) {
          marker.remove();
          injectedMarkersRef.current.delete(id);
        }
      });

      savedMediaRef.current.forEach((waypoint) => {
        if (!injectedMarkersRef.current.has(waypoint.id)) {
          const marker = injectDOMMarker(waypoint);
          if (marker) {
            injectedMarkersRef.current.set(waypoint.id, marker);
          }
        }
      });
    };

    if (map.isStyleLoaded()) {
      applyWaypoints();
    } else {
      map.once("style.load", applyWaypoints);
    }
  }, [savedMedia]);

  const centerOnCoords = (coords: [number, number]) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.easeTo({ center: coords, zoom: 17, duration: 700 });
  };

  return { viewMode, toggleViewPerspective, handleLocationStream, updateVectorPath, injectDOMMarker, centerOnCoords };
}
