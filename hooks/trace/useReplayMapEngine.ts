"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type mapboxgl from "mapbox-gl";
import { ViewMode, WaypointMedia, WaypointGroup, groupWaypoints, CACHE_KEY } from "@/types";
import { chaikinSmooth } from "./chaikinSmooth";

export function useReplayMapEngine(
  mapRef: React.RefObject<HTMLDivElement | null>,
  baseLocation: [number, number] | null,
  onGroupSelect: (group: WaypointGroup) => void,
  trailCoordinates: [number, number][] = [],
  savedMedia: WaypointMedia[] = [],
  isSynced: boolean = false,
  isFollowing: boolean = false,
  unlockedWaypointIds: Set<string> = new Set(),
  progressCoords: [number, number][] = [],
  gpsAccuracy: number = 0
) {
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const injectedMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [viewMode, setViewMode] = useState<ViewMode>("flat");
  const [mapError, setMapError] = useState<string | null>(null);
  const mapboxglRef = useRef<any>(null);
  const userCoordsRef = useRef<[number, number] | null>(null);
  const accuracyRef = useRef(gpsAccuracy);

  const [mapDebugInfo, setMapDebugInfo] = useState("checking...");
  const trailDotMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const debugTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const trailCoordsRef = useRef(trailCoordinates);
  useEffect(() => { trailCoordsRef.current = trailCoordinates; }, [trailCoordinates]);
  useEffect(() => { accuracyRef.current = gpsAccuracy; }, [gpsAccuracy]);
  const baseLocRef = useRef(baseLocation);
  useEffect(() => { baseLocRef.current = baseLocation; }, [baseLocation]);

  const addReplayVisuals = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const apply = () => {
      // Belt-and-suspenders: if map ref was cleared between call and apply, bail
      const m = mapInstanceRef.current;
      if (!m) return;
      const ghostCoords = trailCoordsRef.current;

      try {
        // Clean up existing replay layers if they exist (handles style reload)
        if (map.getLayer("progress-trail-layer")) {
          map.removeLayer("progress-trail-layer");
          map.removeSource("progress-trail-source");
        }
        if (map.getLayer("ghost-trail-layer")) {
          map.removeLayer("ghost-trail-layer");
          map.removeSource("ghost-trail-source");
        }
        if (map.getLayer("ghost-trail-dots-layer")) {
          map.removeLayer("ghost-trail-dots-layer");
        }
        if (map.getSource("ghost-trail-points-source")) {
          map.removeSource("ghost-trail-points-source");
        }
        // Clean up previous DOM trail markers (bypass GeoJSON test)
        trailDotMarkersRef.current.forEach((m) => m.remove());
        trailDotMarkersRef.current = [];

        const smoothed = ghostCoords.length >= 2 ? chaikinSmooth(ghostCoords) : [];

        map.addSource("ghost-trail-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: smoothed },
              },
              ...ghostCoords.map((c) => ({
                type: "Feature" as const,
                properties: {} as Record<string, unknown>,
                geometry: { type: "Point" as const, coordinates: c },
              })),
            ],
          },
        });

        map.addLayer({
          id: "ghost-trail-layer",
          type: "line",
          source: "ghost-trail-source",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#FF0000", "line-width": 12, "line-opacity": 1.0 },
        });

        map.addLayer({
          id: "ghost-trail-dots-layer",
          type: "circle",
          source: "ghost-trail-source",
          paint: { "circle-color": "#00FF00", "circle-radius": 8, "circle-opacity": 1.0 },
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
          paint: { "line-color": "#00FF00", "line-width": 8, "line-opacity": 1.0 },
        });

        const startEl = document.createElement("div");
        startEl.className = "w-5 h-5 rounded-full bg-[#0052FF] border-[3px] border-white shadow-[0_0_16px_rgba(0,82,255,0.6)] pointer-events-none";
        const coords = trailCoordsRef.current;
        const startLoc = coords.length > 0 ? coords[0] : baseLocRef.current || [0, 0];
        const startMarker = new mapboxglRef.current.Marker({ element: startEl }).setLngLat(startLoc).addTo(map);
        startMarkerRef.current = startMarker;

        // DOM trail markers (bypasses GeoJSON layer pipeline for diagnostic)
        const markers = trailDotMarkersRef.current;
        coords.forEach((c) => {
          const dot = document.createElement("div");
          dot.className = "w-[6px] h-[6px] rounded-full bg-[#00FF00] shadow-[0_0_6px_rgba(0,255,0,0.8)] pointer-events-none";
          const m = new mapboxglRef.current.Marker({ element: dot }).setLngLat(c).addTo(map);
          markers.push(m);
        });
      } catch (e: any) {
        console.error("DEBUG: addReplayVisuals error:", e);
        setMapError(e?.message || "Unknown error adding trail visuals");
      }
    };

    // Always try immediately
    if (map.isStyleLoaded()) {
      apply();
    }
    // Also register for next style.load as fallback
    map.once("style.load", apply);
  }, []);

  const removeReplayVisuals = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (map.getLayer("progress-trail-layer")) map.removeLayer("progress-trail-layer");
    if (map.getSource("progress-trail-source")) map.removeSource("progress-trail-source");
    if (map.getLayer("ghost-trail-layer")) map.removeLayer("ghost-trail-layer");
    if (map.getLayer("ghost-trail-dots-layer")) map.removeLayer("ghost-trail-dots-layer");
    if (map.getSource("ghost-trail-source")) map.removeSource("ghost-trail-source");

    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
    trailDotMarkersRef.current.forEach((m) => m.remove());
    trailDotMarkersRef.current = [];
  }, []);

  // Mount Instance Mapbox Canvas
  useEffect(() => {
    if (!baseLocation || !mapRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const mbgl = await import("mapbox-gl");
        await import("mapbox-gl/dist/mapbox-gl.css");

        if (cancelled) return;

        mapboxglRef.current = mbgl.default;
        const mapboxgl = mapboxglRef.current;
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

        let hasCache = false;
        try {
          if (localStorage.getItem(CACHE_KEY)) hasCache = true;
        } catch {}

        const map = new mapboxgl.Map({
          container: mapRef.current!,
          style: "mapbox://styles/mapbox/streets-v12",
          center: baseLocation,
          zoom: hasCache ? 17 : 14,
          pitch: 0,
          bearing: 0,
          antialias: true,
          attributionControl: false,
        });

        // Set ref IMMEDIATELY — style.load can fire synchronously
        mapInstanceRef.current = map;

        map.on("style.load", () => {
          map.setFog({
            color: "rgb(230, 240, 255)",
            "high-color": "rgb(255, 255, 255)",
            "horizon-blend": 0.03,
          });

          map.addSource("accuracy-circle-source", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: baseLocation },
            },
          });

          map.addLayer({
            id: "accuracy-circle-layer",
            type: "circle",
            source: "accuracy-circle-source",
            paint: {
              "circle-color": "#0052FF",
              "circle-opacity": 0.12,
              "circle-radius": 0,
              "circle-stroke-color": "#0052FF",
              "circle-stroke-width": 1,
              "circle-stroke-opacity": 0.3,
            },
          });

          // Add replay visuals
          addReplayVisuals();
        });

        // User marker — starts black in replay (viewer)
        const el = document.createElement("div");
        el.className = "w-5 h-5 rounded-full bg-black border-[3px] border-white shadow-[0_0_16px_rgba(0,0,0,0.5)] flex items-center justify-center relative";
        el.innerHTML = `<span class="absolute inset-0 rounded-full bg-black/30 animate-ping scale-[1.8] pointer-events-none" style="animation-duration: 2s;" />`;

        const userMarker = new mapboxgl.Marker({ element: el }).setLngLat(baseLocation).addTo(map);

        userMarkerRef.current = userMarker;

        // Poll map/layer state for on-screen debug badge
        debugTimerRef.current = setInterval(() => {
          const m = mapInstanceRef.current;
          if (!m) { setMapDebugInfo("no map instance"); return; }
          const ghostSource = !!m.getSource("ghost-trail-source");
          const ghostLayer = !!m.getLayer("ghost-trail-layer");
          const ghostDots = !!m.getLayer("ghost-trail-dots-layer");
          const trailLen = trailCoordsRef.current.length;
          setMapDebugInfo(
            `map=✓ src=${ghostSource} ly=${ghostLayer} dots=${ghostDots} pts=${trailLen}`
          );
        }, 3000);
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to load Mapbox:", e);
          setMapError("Could not load map. Please check your internet connection and try again.");
        }
      }
    })();

    const markerCache = injectedMarkersRef.current;
    return () => {
      cancelled = true;
      if (debugTimerRef.current) clearInterval(debugTimerRef.current);
      debugTimerRef.current = null;
      if (userMarkerRef.current) userMarkerRef.current.remove();
      removeReplayVisuals();
      if (mapInstanceRef.current) mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerCache.forEach((marker) => marker.remove());
      markerCache.clear();
    };
  }, [baseLocation, mapRef, addReplayVisuals, removeReplayVisuals]);

  // Move start marker to trail start when trail loads
  useEffect(() => {
    if (!startMarkerRef.current || trailCoordinates.length < 1) return;
    startMarkerRef.current.setLngLat(trailCoordinates[0]);
  }, [trailCoordinates]);

  // Update ghost trail data
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || trailCoordinates.length < 2) return;

    const applyGhost = () => {
      const source = map.getSource("ghost-trail-source") as mapboxgl.GeoJSONSource;
      if (source) {
        const smoothed = chaikinSmooth(trailCoordinates);
        source.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: smoothed },
            },
            ...trailCoordinates.map((c) => ({
              type: "Feature" as const,
              properties: {} as Record<string, unknown>,
              geometry: { type: "Point" as const, coordinates: c },
            })),
          ],
        });
      }
      // Refresh DOM trail markers
      trailDotMarkersRef.current.forEach((m) => m.remove());
      trailDotMarkersRef.current = [];
      const mbgl = mapboxglRef.current;
      if (mbgl) {
        trailCoordinates.forEach((c) => {
          const dot = document.createElement("div");
          dot.className = "w-[6px] h-[6px] rounded-full bg-[#00FF00] shadow-[0_0_6px_rgba(0,255,0,0.8)] pointer-events-none";
          const m = new mbgl.Marker({ element: dot }).setLngLat(c).addTo(map);
          trailDotMarkersRef.current.push(m);
        });
      }
    };

    if (map.isStyleLoaded()) {
      applyGhost();
    }
    map.once("style.load", applyGhost);
  }, [trailCoordinates]);

  // Update progress trail data (solid black line growing as user/simulator advances)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

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
    }
    map.once("style.load", applyProgress);
  }, [progressCoords]);

  // Update user marker appearance based on mode state
  useEffect(() => {
    const marker = userMarkerRef.current;
    if (!marker) return;

    const el = marker.getElement();
    if (isFollowing || isSynced) {
      el.className = "w-5 h-5 rounded-full bg-black border-[3px] border-white shadow-[0_0_16px_rgba(0,0,0,0.5)] flex items-center justify-center relative";
      el.innerHTML = `<span class="absolute inset-0 rounded-full bg-black/30 animate-ping scale-[2] pointer-events-none" style="animation-duration: 1.5s;" />`;
    } else {
      el.className = "w-5 h-5 rounded-full bg-black border-[3px] border-white shadow-[0_0_16px_rgba(0,0,0,0.5)] flex items-center justify-center relative";
      el.innerHTML = `<span class="absolute inset-0 rounded-full bg-black/30 animate-ping scale-[1.8] pointer-events-none" style="animation-duration: 2s;" />`;
    }
  }, [isSynced, isFollowing]);

  const handleLocationStream = (coords: [number, number], heading: number | null) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    userCoordsRef.current = coords;
    if (userMarkerRef.current) userMarkerRef.current.setLngLat(coords);

    // Update accuracy circle
    const accuracySource = map.getSource("accuracy-circle-source") as mapboxgl.GeoJSONSource;
    if (accuracySource && accuracyRef.current > 0) {
      accuracySource.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: coords },
      });

      const zoom = map.getZoom();
      const lat = coords[1];
      const metersPerPx = 156543 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
      const radiusPx = accuracyRef.current / metersPerPx;
      map.setPaintProperty("accuracy-circle-layer", "circle-radius", Math.min(radiusPx, 300));
    }

    if (isFollowing) {
      const targetBearing = heading !== null && heading !== undefined ? heading : map.getBearing();
      map.easeTo({ center: coords, zoom: 17, bearing: targetBearing, duration: 1500 });
    }
  };

  // Update waypoint marker lock state
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

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
  }, [unlockedWaypointIds]);

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

  const injectDOMMarkerGroup = (group: WaypointGroup) => {
    const map = mapInstanceRef.current;
    if (!map) return null;

    const el = document.createElement("div");
    el.style.touchAction = "manipulation";
    const count = group.items.length;

    if (count === 1) {
      el.className = "w-8 h-8 rounded-[10px] bg-black text-white border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] flex items-center justify-center cursor-pointer transform transition-transform active:scale-95 z-30";
      el.style.opacity = "0.35";
      el.style.filter = "grayscale(1)";
      const wp = group.items[0];
      const icons: Record<string, string> = {
        text: `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
        image: `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
        voice: `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>`
      };
      el.innerHTML = icons[wp.type];
    } else {
      const types = [...new Set(group.items.map((i) => i.type))];
      el.className = "relative w-auto h-auto min-w-[36px] px-[6px] py-[5px] rounded-[10px] bg-black border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] flex items-center gap-[3px] cursor-pointer transform transition-transform active:scale-95 z-30";
      el.style.opacity = "0.35";
      el.style.filter = "grayscale(1)";
      const badgeIcons: Record<string, string> = {
        text: `<svg class="w-[12px] h-[12px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
        image: `<svg class="w-[12px] h-[12px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
        voice: `<svg class="w-[12px] h-[12px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>`
      };
      let html = "";
      types.forEach((t) => { html += badgeIcons[t] || ""; });
      html += `<span class="text-[9px] font-bold text-white ml-[2px]">${count}</span>`;
      el.innerHTML = html;
    }

    const handleMarkerTap = (e: Event) => {
      e.stopPropagation();
      onGroupSelect(group);
      map.easeTo({ center: group.coordinates, duration: 600 });
    };

    el.addEventListener("click", handleMarkerTap);
    el.addEventListener("touchend", handleMarkerTap);

    const marker = new mapboxglRef.current.Marker({ element: el }).setLngLat(group.coordinates).addTo(map);
    return marker;
  };

  const savedMediaRef = useRef(savedMedia);
  useEffect(() => {
    savedMediaRef.current = savedMedia;
  }, [savedMedia]);

  const groupVersionRef = useRef(new Map<string, number>());

  // Sync grouped waypoint markers to Mapbox map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const applyWaypointGroups = () => {
      const groups = groupWaypoints(savedMediaRef.current);
      const groupIds = new Set(groups.map((g) => g.id));

      injectedMarkersRef.current.forEach((marker, id) => {
        if (!groupIds.has(id)) {
          marker.remove();
          injectedMarkersRef.current.delete(id);
          groupVersionRef.current.delete(id);
        }
      });

      groups.forEach((group) => {
        const version = group.items.length;
        if (groupVersionRef.current.get(group.id) !== version) {
          const existing = injectedMarkersRef.current.get(group.id);
          if (existing) existing.remove();
          injectedMarkersRef.current.delete(group.id);
          groupVersionRef.current.set(group.id, version);
        }
      });

      groups.forEach((group) => {
        if (!injectedMarkersRef.current.has(group.id)) {
          const marker = injectDOMMarkerGroup(group);
          if (marker) {
            injectedMarkersRef.current.set(group.id, marker);
          }
        }
      });
    };

    if (map.isStyleLoaded()) {
      applyWaypointGroups();
    } else {
      map.once("style.load", applyWaypointGroups);
    }
  }, [savedMedia]);

  const centerOnCoords = (coords: [number, number]) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.easeTo({ center: coords, zoom: 17, duration: 700 });
  };

  const zoomIn = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.zoomIn({ duration: 300 });
  };

  const zoomOut = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.zoomOut({ duration: 300 });
  };

  return { viewMode, toggleViewPerspective, handleLocationStream, centerOnCoords, zoomIn, zoomOut, mapError, mapDebugInfo };
}
