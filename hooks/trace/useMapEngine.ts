"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { ViewMode, WaypointMedia, CACHE_KEY } from "@/types";

export function useMapEngine(
  mapRef: React.RefObject<HTMLDivElement | null>,
  baseLocation: [number, number] | null,
  onWaypointSelect: (waypoint: WaypointMedia) => void,
  trailCoordinates: [number, number][] = [],
  savedMedia: WaypointMedia[] = []
) {
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const injectedMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [viewMode, setViewMode] = useState<ViewMode>("flat");

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

    const el = document.createElement("div");
    el.className = "w-5 h-5 rounded-full bg-[#0052FF] border-4 border-white shadow-[0_2px_10px_rgba(0,82,255,0.4)] flex items-center justify-center relative";
    el.innerHTML = `<span class="absolute inset-0 rounded-full bg-[#0052FF]/30 animate-ping scale-150 pointer-events-none" style="animation-duration: 2s;" />`;

    const userMarker = new mapboxgl.Marker({ element: el }).setLngLat(baseLocation).addTo(map);

    mapInstanceRef.current = map;
    userMarkerRef.current = userMarker;

    const markerCache = injectedMarkersRef.current;
    return () => {
      if (userMarkerRef.current) userMarkerRef.current.remove();
      map.remove();
      mapInstanceRef.current = null;
      markerCache.forEach((marker) => marker.remove());
      markerCache.clear();
    };
  }, [baseLocation, mapRef]);

  const handleLocationStream = (coords: [number, number], heading: number | null) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) userMarkerRef.current.setLngLat(coords);

    const targetBearing = (heading !== null && heading !== undefined) ? heading : 0;
    map.easeTo({ center: coords, zoom: 17, bearing: targetBearing, duration: 1100 });
  };

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
    if (!map) return;

    const applyPath = () => {
      updateVectorPath(trailCoordinates);
    };

    if (map.isStyleLoaded()) {
      applyPath();
    } else {
      map.once("style.load", applyPath);
    }
  }, [trailCoordinates]);

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

      // 1. Remove markers that are no longer in savedMedia
      injectedMarkersRef.current.forEach((marker, id) => {
        if (!currentIds.has(id)) {
          marker.remove();
          injectedMarkersRef.current.delete(id);
        }
      });

      // 2. Add markers that are new
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedMedia]);

  const centerOnCoords = (coords: [number, number]) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.easeTo({ center: coords, zoom: 17, duration: 700 });
  };

  return { viewMode, toggleViewPerspective, handleLocationStream, updateVectorPath, injectDOMMarker, centerOnCoords };
}
