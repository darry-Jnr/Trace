"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type mapboxgl from "mapbox-gl";
import { ViewMode, WaypointMedia, WaypointGroup, groupWaypoints, CACHE_KEY } from "@/types";
import { chaikinSmooth } from "./chaikinSmooth";
import { douglasPeucker } from "./douglasPeucker";

export function useMapEngine(
  mapRef: React.RefObject<HTMLDivElement | null>,
  baseLocation: [number, number] | null,
  onGroupSelect: (group: WaypointGroup) => void,
  trailCoordinates: [number, number][] = [],
  savedMedia: WaypointMedia[] = [],
  isRecording: boolean = false,
  isReplayMode: boolean = false,
  isSynced: boolean = false,
  isFollowing: boolean = false,
  unlockedWaypointIds: Set<string> = new Set(),
  progressCoords: [number, number][] = [],
  distanceToStart: number | null = null
) {
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const injectedMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [viewMode, setViewMode] = useState<ViewMode>("flat");
  const [mapError, setMapError] = useState<string | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapboxglRef = useRef<any>(null);
  const lastSmoothRef = useRef(0);
  const userCoordsRef = useRef<[number, number] | null>(null);
  const lastAutoZoomRef = useRef(0);
  const zoomModeRef = useRef<"far" | "near" | null>(null);
  const lastCenteredRef = useRef<[number, number] | null>(null);

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

        const isReplayOnMount = isReplayMode;
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

          // Retry replay visuals — map is now ready
          if (isReplayOnMount) addReplayVisuals();
        });

        // User marker — starts green in replay (viewer), blue in recording
        const el = document.createElement("div");
        const isViewerMode = isReplayMode && !isSynced;
        el.className = `w-5 h-5 rounded-full border-4 border-white flex items-center justify-center relative`;
        el.style.background = isViewerMode ? "#22C55E" : "#0052FF";
        el.style.boxShadow = isViewerMode ? "0 2px 10px rgba(34,197,94,0.4)" : "0 2px 10px rgba(0,82,255,0.4)";
        el.innerHTML = `<span class="absolute inset-0 rounded-full animate-ping scale-150 pointer-events-none" style="animation-duration: 2s; background: ${isViewerMode ? "#22C55E" : "#0052FF"}30" />`;

        const userMarker = new mapboxgl.Marker({ element: el }).setLngLat(baseLocation).addTo(map);

        mapInstanceRef.current = map;
        userMarkerRef.current = userMarker;
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
      if (userMarkerRef.current) userMarkerRef.current.remove();
      removeReplayVisuals();
      if (mapInstanceRef.current) mapInstanceRef.current.remove();
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
      startEl.className = "w-5 h-5 rounded-full bg-[#0052FF] border-[3px] border-white shadow-[0_0_16px_rgba(0,82,255,0.6)] pointer-events-none";
      const coords = trailCoordsRef.current;
      const startLoc = coords.length > 0 ? coords[0] : baseLocRef.current || [0, 0];
      const startMarker = new mapboxglRef.current.Marker({ element: startEl }).setLngLat(startLoc).addTo(map);
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
          geometry: { type: "LineString", coordinates: chaikinSmooth(trailCoordinates) },
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
          geometry: { type: "LineString", coordinates: chaikinSmooth(progressCoords) },
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

  function getDistanceMeters(a: [number, number], b: [number, number]) {
    const R = 6371000;
    const dLat = ((b[1] - a[1]) * Math.PI) / 180;
    const dLng = ((b[0] - a[0]) * Math.PI) / 180;
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const a2 =
      sinLat * sinLat +
      Math.cos((a[1] * Math.PI) / 180) *
        Math.cos((b[1] * Math.PI) / 180) *
        sinLng * sinLng;
    return R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
  }

  const handleLocationStream = (coords: [number, number], heading: number | null) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    userCoordsRef.current = coords;
    if (userMarkerRef.current) userMarkerRef.current.setLngLat(coords);

    if (isReplayMode && isFollowing) {
      const targetBearing = heading !== null && heading !== undefined ? heading : map.getBearing();
      map.easeTo({ center: coords, zoom: 17, bearing: targetBearing, duration: 1500 });
    } else if (!isReplayMode) {
      // Skip re-centering if user hasn't moved enough to prevent map shaking
      const lastCenter = lastCenteredRef.current;
      if (lastCenter && getDistanceMeters(lastCenter, coords) < 5) return;

      const targetBearing = heading !== null && heading !== undefined ? heading : map.getBearing();
      map.easeTo({ center: coords, zoom: 17, bearing: targetBearing, duration: 1100 });
      lastCenteredRef.current = coords;
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

  const updateVectorPath = (coordinates: [number, number][], smooth = true) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const source = map.getSource("recording-trail-source") as mapboxgl.GeoJSONSource;
    if (source) {
      const now = Date.now();
      const simplified = douglasPeucker(coordinates, 0.5);
      const coords = smooth && (now - lastSmoothRef.current > 2000 || simplified.length < 10)
        ? chaikinSmooth(simplified)
        : simplified;
      if (smooth) lastSmoothRef.current = now;
      source.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: coords },
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

  const injectDOMMarkerGroup = (group: WaypointGroup) => {
    const map = mapInstanceRef.current;
    if (!map) return null;

    const el = document.createElement("div");
    const count = group.items.length;

    if (count === 1) {
      // Single item — current marker style
      el.className = "w-8 h-8 rounded-[10px] bg-black text-white border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] flex items-center justify-center cursor-pointer transform transition-transform active:scale-95 z-30";
      if (isReplayMode) {
        el.style.opacity = "0.35";
        el.style.filter = "grayscale(1)";
      }
      const wp = group.items[0];
      const icons: Record<string, string> = {
        text: `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
        image: `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
        voice: `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>`
      };
      el.innerHTML = icons[wp.type];
    } else {
      // Multiple items — show type badges + count
      const types = [...new Set(group.items.map((i) => i.type))];
      el.className = "relative w-auto h-auto min-w-[36px] px-[6px] py-[5px] rounded-[10px] bg-black border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] flex items-center gap-[3px] cursor-pointer transform transition-transform active:scale-95 z-30";
      if (isReplayMode) {
        el.style.opacity = "0.35";
        el.style.filter = "grayscale(1)";
      }
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

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onGroupSelect(group);
      map.easeTo({ center: group.coordinates, duration: 600 });
    });

    const marker = new mapboxglRef.current.Marker({ element: el }).setLngLat(group.coordinates).addTo(map);
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
  }, [trailCoordinates, isReplayMode]);

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

  // Auto-zoom in replay mode
  useEffect(() => {
    if (!isReplayMode || distanceToStart === null || !mapInstanceRef.current) return;
    const now = Date.now();
    if (now - lastAutoZoomRef.current < 3000) return;
    lastAutoZoomRef.current = now;

    const map = mapInstanceRef.current;
    const user = userCoordsRef.current;
    const start = trailCoordinates.length > 0 ? trailCoordinates[0] : null;
    if (!user || !start) return;

    const farThreshold = zoomModeRef.current === "near" ? 120 : 100;
    const nearThreshold = zoomModeRef.current === "far" ? 80 : 100;

    if (distanceToStart > farThreshold) {
      zoomModeRef.current = "far";
      const bounds = new mapboxglRef.current.LngLatBounds();
      bounds.extend(user);
      bounds.extend(start);
      map.fitBounds(bounds, { padding: 100, duration: 2000, maxZoom: 14 });
    } else if (distanceToStart > 15 && distanceToStart < nearThreshold) {
      zoomModeRef.current = "near";
      const mid: [number, number] = [
        (user[0] + start[0]) / 2,
        (user[1] + start[1]) / 2,
      ];
      const zoom = Math.min(17, 14 + (1 - distanceToStart / 100) * 3);
      map.easeTo({ center: mid, zoom, duration: 2000 });
    }
  }, [isReplayMode, distanceToStart, trailCoordinates]);

  return { viewMode, toggleViewPerspective, handleLocationStream, updateVectorPath, centerOnCoords, zoomIn, zoomOut, mapError };
}
