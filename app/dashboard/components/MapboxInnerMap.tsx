"use client";

import { useEffect, useRef } from "react";
import Map, { Marker, Source, Layer, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapboxInnerMapProps {
    userLocation: [number, number] | null;
    tracePath: [number, number][];
    onZoomChange?: (zoom: number) => void;
}

export default function MapboxInnerMap({
    userLocation,
    tracePath,
    onZoomChange,
}: MapboxInnerMapProps) {
    const mapRef = useRef<MapRef>(null);
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    // Smoothly fly to user location when coordinates update
    useEffect(() => {
        if (userLocation && mapRef.current) {
            mapRef.current.flyTo({
                center: [userLocation[1], userLocation[0]], // [longitude, latitude]
                zoom: 19.5, // 3D street/walking level zoom
                pitch: 65,  // Tilted 3D perspective
                duration: 1500,
            });
        }
    }, [userLocation]);

    // On map load, inject a 3D building extrusion layer
    const onMapLoad = (e: any) => {
        const map = e.target;
        const layers = map.getStyle().layers;
        const labelLayerId = layers?.find(
            (layer: any) => layer.type === "symbol" && layer.layout?.["text-field"]
        )?.id;

        map.addLayer(
            {
                id: "add-3d-buildings",
                source: "composite",
                "source-layer": "building",
                filter: ["==", "extrude", "true"],
                type: "fill-extrusion",
                minzoom: 15,
                paint: {
                    "fill-extrusion-color": "#e2e8f0",
                    "fill-extrusion-height": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        15,
                        0,
                        15.05,
                        ["get", "height"],
                    ],
                    "fill-extrusion-base": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        15,
                        0,
                        15.05,
                        ["get", "min_height"],
                    ],
                    "fill-extrusion-opacity": 0.6,
                },
            },
            labelLayerId
        );
    };

    if (!userLocation) {
        return null;
    }

    // Friendly, premium overlay in case the Mapbox token is not configured yet
    if (!mapboxToken) {
        return (
            <div className="w-full h-full min-h-[400px] rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center p-6 relative overflow-hidden select-none">
                {/* Decorative glow background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#0052FF]/10 rounded-full blur-[80px]" />
                
                <div className="max-w-md w-full bg-neutral-900/65 backdrop-blur-lg border border-white/5 p-8 rounded-3xl shadow-2xl relative z-10 flex flex-col items-center text-center">
                    {/* Badge */}
                    <div className="h-9 px-4 rounded-full bg-[#0052FF]/15 border border-[#0052FF]/30 flex items-center justify-center text-[11px] font-bold text-[#0052FF] tracking-wider uppercase mb-6">
                        Mapbox Token Required
                    </div>
                    
                    <h2 className="text-xl font-bold text-white mb-3 tracking-tight">
                        Configure Mapbox Access Token
                    </h2>
                    
                    <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                        To view high-performance vector maps and live route traces, please configure your Mapbox credentials.
                    </p>
                    
                    <div className="w-full text-left bg-black/40 border border-white/5 p-4 rounded-2xl space-y-3 mb-6 text-xs text-neutral-400 font-medium">
                        <div className="flex gap-2.5">
                            <span className="text-[#0052FF] font-bold">1.</span>
                            <span>Get a free token from <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-[#0052FF] hover:underline font-bold">mapbox.com</a></span>
                        </div>
                        <div className="flex gap-2.5">
                            <span className="text-[#0052FF] font-bold">2.</span>
                            <span>Create a <code className="bg-neutral-850 px-1.5 py-0.5 rounded text-white font-mono text-[10px]">.env.local</code> file in root</span>
                        </div>
                        <div className="flex gap-2.5 items-start">
                            <span className="text-[#0052FF] font-bold">3.</span>
                            <span className="break-all font-mono text-neutral-300 select-all">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token</span>
                        </div>
                    </div>
                    
                    <div className="text-[11px] text-neutral-500 font-medium">
                        Note: Restart your dev server after updating environment variables.
                    </div>
                </div>
            </div>
        );
    }

    // Prepare GeoJSON representation for the route trace path
    const geojson = {
        type: "Feature" as const,
        properties: {},
        geometry: {
            type: "LineString" as const,
            coordinates: tracePath.map((coord) => [coord[1], coord[0]]), // [longitude, latitude]
        },
    };

    return (
        <div className="w-full h-full relative rounded-2xl overflow-hidden border border-black/5 shadow-inner">
            <Map
                ref={mapRef}
                initialViewState={{
                    longitude: userLocation[1],
                    latitude: userLocation[0],
                    zoom: 19.5,
                    pitch: 65,
                }}
                style={{ width: "100%", height: "100%" }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={mapboxToken}
                minZoom={14}
                maxZoom={20}
                onMove={(evt) => {
                    if (onZoomChange) {
                        onZoomChange(evt.viewState.zoom);
                    }
                }}
                onLoad={onMapLoad}
            >
                {/* Pulsing Blue Custom Marker for User's live location */}
                <Marker longitude={userLocation[1]} latitude={userLocation[0]} anchor="center">
                    <div className="relative flex items-center justify-center h-8 w-8">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0052FF]/20 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-white border border-[#0052FF]/20 shadow-md items-center justify-center">
                            <span className="h-3 w-3 rounded-full bg-[#0052FF] shadow-sm"></span>
                        </span>
                    </div>
                </Marker>

                {/* Vector route trace line */}
                {tracePath.length > 1 && (
                    <Source id="trace-path" type="geojson" data={geojson}>
                        <Layer
                            id="trace-path-line"
                            type="line"
                            layout={{
                                "line-join": "round",
                                "line-cap": "round",
                            }}
                            paint={{
                                "line-color": "#0052FF",
                                "line-width": 5,
                            }}
                        />
                    </Source>
                )}
            </Map>
        </div>
    );
}
