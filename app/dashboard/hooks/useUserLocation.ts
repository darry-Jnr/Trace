
"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

type LocationStatus =
    | "loading"
    | "connected"
    | "error";

export function useUserLocation() {
    const toast = useToast();

    const [userLocation, setUserLocation] =
        useState<[number, number] | null>(null);

    const [locationStatus, setLocationStatus] =
        useState<LocationStatus>("loading");

    const handleFallback = async (title: string, message: string) => {
        toast.warning(title, message);

        try {
            // Attempt to resolve location using a public IP geolocation API
            const response = await fetch("https://ipapi.co/json/");
            if (response.ok) {
                const data = await response.json();
                if (data && typeof data.latitude === "number" && typeof data.longitude === "number") {
                    const coords: [number, number] = [data.latitude, data.longitude];
                    setUserLocation(coords);
                    setLocationStatus("connected");
                    toast.success(
                        "Location Found",
                        `Approximate location set via internet connection (${data.city || "IP-based"}).`
                    );
                    return;
                }
            }
        } catch (err) {
            console.error("IP geolocation fallback failed:", err);
        }

        // Hard fallback to London coordinates as a baseline if internet-based lookup fails
        const fallbackCoords: [number, number] = [51.5074, -0.1278];
        setUserLocation(fallbackCoords);
        setLocationStatus("connected");
        toast.error(
            "GPS Blocked/Unavailable",
            "Could not determine location. Defaulting to London baseline."
        );
    };

    const getLocation = () => {
        setLocationStatus("loading");

        // browser unsupported
        if (!navigator.geolocation) {
            handleFallback(
                "GPS Unsupported",
                "Your browser does not support geolocation. Attempting IP geolocation..."
            );
            return;
        }

        // FAST first location
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords: [number, number] = [
                    position.coords.latitude,
                    position.coords.longitude,
                ];

                // immediately render map
                setUserLocation(coords);
                setLocationStatus("connected");

                // background refinement
                navigator.geolocation.watchPosition(
                    (betterPosition) => {
                        const refinedCoords: [
                            number,
                            number
                        ] = [
                                betterPosition.coords.latitude,
                                betterPosition.coords.longitude,
                            ];

                        // silently improve precision
                        setUserLocation(refinedCoords);
                    },
                    () => { },
                    {
                        enableHighAccuracy: true,
                        timeout: 15000,
                        maximumAge: 10000,
                    }
                );
            },
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    handleFallback(
                        "Location Permission Needed",
                        "Please allow location access. Attempting IP geolocation..."
                    );
                } else if (error.code === error.TIMEOUT) {
                    handleFallback(
                        "GPS Timeout",
                        "GPS signal search timed out. Attempting IP geolocation..."
                    );
                } else {
                    handleFallback(
                        "GPS Connection Failed",
                        "Unable to find location. Attempting IP geolocation..."
                    );
                }
            },
            {
                // KEY:
                // use quick network/cached location first
                enableHighAccuracy: false,
                // allow cached location
                maximumAge: 60000,
                // fail less quickly to allow device to coordinate lock
                timeout: 8000,
            }
        );
    };

    useEffect(() => {
        getLocation();
    }, []);

    return {
        userLocation,
        locationStatus,
        retryLocation: getLocation,
    };
}

