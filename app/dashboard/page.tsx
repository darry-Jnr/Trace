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
} from "lucide-react";

import "mapbox-gl/dist/mapbox-gl.css";

type LoadingStage =
    | "booting"
    | "searching"
    | "improving"
    | "done";

type ViewMode = "flat" | "tilted";

export default function Dashboard() {
    // ==================================================
    // REFS
    // ==================================================

    const mapRef =
        useRef<HTMLDivElement>(null);

    const mapInstanceRef =
        useRef<mapboxgl.Map | null>(null);

    const markerRef =
        useRef<mapboxgl.Marker | null>(null);

    const watchIdRef =
        useRef<number | null>(null);

    // ==================================================
    // STATE
    // ==================================================

    const [baseLocation, setBaseLocation] =
        useState<[number, number] | null>(
            null
        );

    const [userLocation, setUserLocation] =
        useState<[number, number] | null>(
            null
        );

    const [isLoading, setIsLoading] =
        useState(true);

    const [loadingStage, setLoadingStage] =
        useState<LoadingStage>("booting");

    const [viewMode, setViewMode] =
        useState<ViewMode>("flat");

    // ==================================================
    // FAST MAP BOOT USING IP
    // ==================================================

    useEffect(() => {
        async function prepareMap() {
            try {
                const response = await fetch(
                    "https://ipapi.co/json/"
                );

                const data =
                    await response.json();

                if (
                    data.longitude &&
                    data.latitude
                ) {
                    setBaseLocation([
                        data.longitude,
                        data.latitude,
                    ]);
                } else {
                    // lagos fallback
                    setBaseLocation([
                        3.3792,
                        6.5244,
                    ]);
                }
            } catch {
                setBaseLocation([
                    3.3792,
                    6.5244,
                ]);
            }
        }

        prepareMap();
    }, []);

    // ==================================================
    // INITIALIZE MAPBOX
    // ==================================================

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

        const map = new mapboxgl.Map({
            container: mapRef.current,

            style:
                "mapbox://styles/mapbox/streets-v12",

            center: baseLocation,

            zoom: 14,

            pitch: 0,

            bearing: 0,

            antialias: true,
        });

        // smooth atmosphere
        map.on("style.load", () => {
            map.setFog({
                color: "rgb(255,255,255)",
                "high-color":
                    "rgb(245,245,247)",

                "horizon-blend": 0.02,
            });
        });

        // blue user marker
        const marker =
            new mapboxgl.Marker({
                color: "#0052FF",
                scale: 1.1,
            })
                .setLngLat(baseLocation)
                .addTo(map);

        mapInstanceRef.current = map;

        markerRef.current = marker;

        return () => {
            map.remove();

            mapInstanceRef.current = null;
        };
    }, [baseLocation]);

    // ==================================================
    // REAL GPS LOCATION
    // ==================================================

    useEffect(() => {
        if (!navigator.geolocation) {
            setIsLoading(false);
            return;
        }

        setLoadingStage("searching");

        const watchId =
            navigator.geolocation.watchPosition(
                (position) => {
                    const coords: [
                        number,
                        number
                    ] = [
                        position.coords
                            .longitude,

                        position.coords
                            .latitude,
                    ];

                    const accuracy =
                        position.coords
                            .accuracy;

                    setUserLocation(coords);

                    // move camera
                    if (
                        mapInstanceRef.current
                    ) {
                        mapInstanceRef.current.flyTo(
                            {
                                center: coords,

                                zoom: 17,

                                speed: 1.1,

                                essential: true,
                            }
                        );
                    }

                    // move marker
                    if (markerRef.current) {
                        markerRef.current.setLngLat(
                            coords
                        );
                    }

                    // low accuracy
                    if (accuracy > 100) {
                        setLoadingStage(
                            "improving"
                        );

                        setIsLoading(false);
                    } else {
                        // strong lock
                        setLoadingStage("done");

                        setIsLoading(false);

                        if (
                            watchIdRef.current !==
                            null
                        ) {
                            navigator.geolocation.clearWatch(
                                watchIdRef.current
                            );
                        }
                    }
                },

                (error) => {
                    console.log(
                        "GPS error:",
                        error
                    );

                    setIsLoading(false);
                },

                {
                    enableHighAccuracy: true,

                    timeout: 15000,

                    maximumAge: 0,
                }
            );

        watchIdRef.current = watchId;

        return () => {
            navigator.geolocation.clearWatch(
                watchId
            );
        };
    }, []);

    // ==================================================
    // LOADING TEXT
    // ==================================================

    const loadingMessage = {
        booting: "Preparing workspace",

        searching:
            "Finding nearby position",

        improving:
            "Improving GPS accuracy",

        done: "Location connected",
    }[loadingStage];

    // ==================================================
    // VIEW TOGGLE
    // ==================================================

    const toggleView = () => {
        const map = mapInstanceRef.current;

        if (!map) return;

        if (viewMode === "flat") {
            map.easeTo({
                pitch: 65,

                bearing: 15,

                duration: 1200,
            });

            setViewMode("tilted");
        } else {
            map.easeTo({
                pitch: 0,

                bearing: 0,

                duration: 1200,
            });

            setViewMode("flat");
        }
    };

    // ==================================================
    // RETRY LOCATION
    // ==================================================

    const retryLocation = () => {
        setIsLoading(true);

        setLoadingStage("searching");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords: [
                    number,
                    number
                ] = [
                    position.coords
                        .longitude,

                    position.coords.latitude,
                ];

                setUserLocation(coords);

                setIsLoading(false);

                if (
                    mapInstanceRef.current
                ) {
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
            {/* MAP */}
            <div
                ref={mapRef}
                className="w-full h-full"
            />

            {/* TOP BAR */}
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

            {/* VIEW TOGGLE */}
            {!isLoading && userLocation && (
                <button
                    onClick={toggleView}
                    className="
                        absolute
                        bottom-8
                        left-1/2
                        -translate-x-1/2
                        z-40
                        h-14
                        px-5
                        rounded-2xl
                        bg-white/90
                        backdrop-blur-xl
                        border
                        border-black/[0.06]
                        shadow-[0_10px_40px_rgba(0,0,0,0.08)]
                        flex
                        items-center
                        gap-3
                        active:scale-[0.98]
                        transition-all
                    "
                >
                    <div className="w-9 h-9 rounded-xl bg-[#0052FF]/10 flex items-center justify-center">
                        {viewMode ===
                        "flat" ? (
                            <Mountain className="w-4 h-4 text-[#0052FF]" />
                        ) : (
                            <Map className="w-4 h-4 text-[#0052FF]" />
                        )}
                    </div>

                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-medium text-black/40 uppercase tracking-wider">
                            View
                        </span>

                        <span className="text-sm font-semibold tracking-tight text-black">
                            {viewMode ===
                            "flat"
                                ? "Tilted"
                                : "Flat"}{" "}
                            Mode
                        </span>
                    </div>
                </button>
            )}

            {/* LOADING */}
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
                                Syncing navigation
                                environment
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ACCURACY BANNER */}
            {!isLoading &&
                loadingStage ===
                    "improving" && (
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
                            <LocateFixed className="w-4 h-4 text-[#0052FF] animate-pulse" />

                            <p className="text-xs font-semibold tracking-tight text-black/70">
                                Improving accuracy
                            </p>
                        </div>
                    </div>
                )}

            {/* LOCATION ERROR */}
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
                            Trace could not access
                            your GPS location.
                            Please allow location
                            permissions and try
                            again.
                        </p>

                        <button
                            onClick={retryLocation}
                            className="
                                mt-6
                                w-full
                                h-12
                                rounded-2xl
                                bg-black
                                text-white
                                text-sm
                                font-semibold
                                flex
                                items-center
                                justify-center
                                gap-2
                                active:scale-[0.98]
                                transition-all
                            "
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