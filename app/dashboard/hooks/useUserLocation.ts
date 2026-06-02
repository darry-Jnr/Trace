
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

    const getLocation = () => {
        setLocationStatus("loading");

        // browser unsupported
        if (!navigator.geolocation) {
            setLocationStatus("error");

            toast.error(
                "GPS Unsupported",
                "Your browser does not support geolocation."
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
                setLocationStatus("error");

                if (
                    error.code ===
                    error.PERMISSION_DENIED
                ) {
                    toast.error(
                        "Location Permission Needed",
                        "Please allow location access."
                    );
                } else {
                    toast.error(
                        "Unable to Find Location",
                        "Check your internet or GPS."
                    );
                }
            },

            {
                // KEY:
                // use quick network/cached location first
                enableHighAccuracy: false,

                // allow cached location
                maximumAge: 60000,

                // fail quickly
                timeout: 4000,
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

