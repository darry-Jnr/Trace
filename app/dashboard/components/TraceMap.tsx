"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import MapController from "./MapController";

const MapContainer = dynamic(
    () =>
        import("react-leaflet").then(
            (mod) => mod.MapContainer
        ),
    { ssr: false }
);

const TileLayer = dynamic(
    () =>
        import("react-leaflet").then(
            (mod) => mod.TileLayer
        ),
    { ssr: false }
);

const Marker = dynamic(
    () =>
        import("react-leaflet").then(
            (mod) => mod.Marker
        ),
    { ssr: false }
);

const Polyline = dynamic(
    () =>
        import("react-leaflet").then(
            (mod) => mod.Polyline
        ),
    { ssr: false }
);

export default function TraceMap({
    userLocation,
    tracePath,
}: {
    userLocation: [number, number] | null;
    tracePath: [number, number][];
}) {
    const [leafletLoaded, setLeafletLoaded] =
        useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            import("leaflet").then((L) => {
                // @ts-ignore
                delete L.Icon.Default.prototype._getIconUrl;

                L.Icon.Default.mergeOptions({
                    iconRetinaUrl:
                        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
                    iconUrl:
                        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
                    shadowUrl:
                        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                });

                setLeafletLoaded(true);
            });
        }
    }, []);

    if (!leafletLoaded || !userLocation) {
        return null;
    }

    return (
        <>
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
            />

            <MapContainer
                center={userLocation}
                zoom={18}
                minZoom={14}
                maxZoom={20}
                zoomControl={false}
                className="w-full h-full"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />

                <MapController
                    center={userLocation}
                />

                <Marker position={userLocation} />

                {tracePath.length > 1 && (
                    <Polyline
                        positions={tracePath}
                        pathOptions={{
                            color: "#000",
                            weight: 5,
                        }}
                    />
                )}
            </MapContainer>
        </>
    );
}
