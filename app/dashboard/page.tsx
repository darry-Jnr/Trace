"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export default function Dashboard() {
  // DOM container for Mapbox
  const mapRef = useRef<HTMLDivElement>(null);

  // stores the actual map instance
  const mapInstanceRef =
    useRef<mapboxgl.Map | null>(null);

  // stores the blue user marker
  const markerRef =
    useRef<mapboxgl.Marker | null>(null);

  // stores initial fallback area
  // ONLY used to boot the map engine
  const [baseLocation, setBaseLocation] =
    useState<[number, number] | null>(null);

  // controls loader overlay visibility
  const [isLoading, setIsLoading] =
    useState(true);

  // stores real GPS coordinates
  const [userLocation, setUserLocation] =
    useState<[number, number] | null>(null);

  // stores all walked coordinates
  const [trail, setTrail] = useState<
    [number, number][]
  >([]);

  // ==================================================
  // STEP 1:
  // GET CHEAP FAST LOCATION FOR INITIAL MAP BOOT
  // ==================================================
  // This is NOT the real GPS.
  // It is only used so the map loads instantly.
  useEffect(() => {
    async function prepareMap() {
      try {
        const response = await fetch(
          "https://ipapi.co/json/"
        );

        const data = await response.json();

        if (
          data.longitude &&
          data.latitude
        ) {
          setBaseLocation([
            data.longitude,
            data.latitude,
          ]);
        } else {
          // Lagos fallback
          setBaseLocation([
            3.3792,
            6.5244,
          ]);
        }
      } catch {
        // if internet fails
        setBaseLocation([
          3.3792,
          6.5244,
        ]);
      }
    }

    prepareMap();
  }, []);

  // ==================================================
  // STEP 2:
  // INITIALIZE MAPBOX ONLY ONCE
  // ==================================================
  // IMPORTANT:
  // The map should NEVER depend on userLocation.
  // If the map mounts/unmounts repeatedly,
  // Mapbox breaks, flashes, or loses state.
  useEffect(() => {
    if (
      !baseLocation ||
      !mapRef.current ||
      mapInstanceRef.current
    ) {
      return;
    }

    mapboxgl.accessToken =
      process.env
        .NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

    // create actual map
    const map = new mapboxgl.Map({
      container: mapRef.current,

      style:
        "mapbox://styles/mapbox/streets-v12",

      center: baseLocation,

      zoom: 14,
    });

    // create user marker
    const marker = new mapboxgl.Marker({
      color: "#0052FF",
    })
      .setLngLat(baseLocation)
      .addTo(map);

    // wait for map engine to fully load
    map.on("load", () => {
      // create empty trail source
      map.addSource("walk-trail", {
        type: "geojson",

        data: {
          type: "Feature",

          properties: {},

          geometry: {
            type: "LineString",

            coordinates: [],
          },
        },
      });

      // create visible trail layer
      map.addLayer({
        id: "walk-trail-layer",

        type: "line",

        source: "walk-trail",

        layout: {
          "line-join": "round",

          "line-cap": "round",
        },

        paint: {
          "line-color": "#0052FF",

          "line-width": 6,

          "line-opacity": 0.9,
        },
      });
    });

    // save references
    mapInstanceRef.current = map;
    markerRef.current = marker;

    // cleanup
    return () => {
      map.remove();

      mapInstanceRef.current = null;
    };
  }, [baseLocation]);

  // ==================================================
  // STEP 3:
  // REQUEST REAL GPS LOCATION
  // ==================================================
  // This gets REAL device coordinates.
  // Once successful:
  // - remove loading overlay
  // - move map camera
  // - move blue marker
  // - begin live tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLoading(false);
      return;
    }

    const watchId =
      navigator.geolocation.watchPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];

          // save real user location
          setUserLocation(coords);

          // remove loading screen
          setIsLoading(false);

          // smoothly move camera
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo({
              center: coords,

              zoom: 17,

              speed: 1.1,
            });
          }

          // move blue marker
          if (markerRef.current) {
            markerRef.current.setLngLat(
              coords
            );
          }

          // save trail coordinate
          setTrail((prev) => [
            ...prev,
            coords,
          ]);
        },

        (error) => {
          console.log(
            "GPS error:",
            error
          );

          // still remove loader
          // user can retry later
          setIsLoading(false);
        },

        {
          enableHighAccuracy: true,

          timeout: 15000,

          maximumAge: 0,
        }
      );

    return () => {
      navigator.geolocation.clearWatch(
        watchId
      );
    };
  }, []);

  // ==================================================
  // STEP 4:
  // UPDATE TRAIL LINE IN REAL TIME
  // ==================================================
  // Every new coordinate redraws the line.
  useEffect(() => {
    if (
      !mapInstanceRef.current ||
      trail.length < 2
    ) {
      return;
    }

    const map = mapInstanceRef.current;

    const source = map.getSource(
      "walk-trail"
    ) as mapboxgl.GeoJSONSource;

    if (!source) return;

    source.setData({
      type: "Feature",

      properties: {},

      geometry: {
        type: "LineString",

        coordinates: trail,
      },
    });
  }, [trail]);

  // ==================================================
  // MANUAL RETRY BUTTON
  // ==================================================
  // Browser security prefers GPS requests
  // from direct user interaction.
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
          markerRef.current.setLngLat(
            coords
          );
        }
      },

      (error) => {
        console.log(error);

        setIsLoading(false);
      },

      {
        enableHighAccuracy: true,
      }
    );
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f5f5f7]">
      {/* ==================================================
                MAP ALWAYS EXISTS
                NEVER CONDITIONALLY RENDER THIS
            ================================================== */}
      <div
        ref={mapRef}
        className="w-full h-full"
      />

      {/* ==================================================
                LOADING OVERLAY
            ================================================== */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-[#f5f5f7]/90 backdrop-blur-md flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-7 h-7 rounded-full border-2 border-black/10 border-t-black animate-spin" />

            <p className="text-sm font-medium text-black/60 tracking-tight">
              Syncing navigation
              workspace...
            </p>
          </div>
        </div>
      )}

      {/* ==================================================
                LOCATION FAILED OVERLAY
            ================================================== */}
      {!isLoading && !userLocation && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-md">
          <div className="w-[340px] rounded-3xl bg-white border border-black/5 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-black tracking-tight">
              Location unavailable
            </h2>

            <p className="mt-2 text-sm text-black/60 leading-relaxed">
              Trace could not access
              your GPS location. Please
              allow location access and
              try again.
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