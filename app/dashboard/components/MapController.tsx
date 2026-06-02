"use client";

import { useEffect } from "react";

export default function MapController({
    center,
}: {
    center: [number, number] | null;
}) {
    const useMap = require("react-leaflet").useMap;
    const map = useMap();

    // Fix leaflet grey tile layout resizing glitches
    useEffect(() => {
        if (map) {
            setTimeout(() => {
                map.invalidateSize({ animate: true });
            }, 100);
        }
    }, [map]);

    // Fly to user coordinates smoothly
    useEffect(() => {
        if (center && map) {
            map.flyTo(center, 18, {
                duration: 1.5,
            });
        }
    }, [center, map]);

    return null;
}
