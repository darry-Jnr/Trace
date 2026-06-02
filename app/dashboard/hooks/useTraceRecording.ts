"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

export function useTraceRecording(
    userLocation: [number, number] | null
) {
    const toast = useToast();
    const [isRecording, setIsRecording] =
        useState(false);

    const [tracePath, setTracePath] = useState<
        [number, number][]
    >([]);

    useEffect(() => {
        let watchId: number;

        if (isRecording && navigator.geolocation) {
            watchId =
                navigator.geolocation.watchPosition(
                    (position) => {
                        const coords: [
                            number,
                            number
                        ] = [
                            position.coords.latitude,
                            position.coords.longitude,
                        ];

                        setTracePath((prev) => [
                            ...prev,
                            coords,
                        ]);
                    },
                    () => {
                        toast.error("Tracking Lost", "Lost live GPS connection. Checking signal...");
                    },
                    {
                        enableHighAccuracy: true,
                    }
                );
        }

        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(
                    watchId
                );
            }
        };
    }, [isRecording, toast]);

    return {
        isRecording,
        setIsRecording,
        tracePath,
    };
}
