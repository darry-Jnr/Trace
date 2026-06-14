import { chaikinSmooth } from "@/hooks/trace/chaikinSmooth";

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const MATCHING_API = "https://api.mapbox.com/matching/v5/mapbox/walking";

export async function snapToRoads(
  coords: [number, number][]
): Promise<[number, number][]> {
  if (coords.length < 2) return coords;

  if (!MAPBOX_ACCESS_TOKEN) {
    console.warn("snapToRoads: Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN — falling back to Chaikin smoothing");
    return chaikinSmooth(coords);
  }

  const batchSize = 100;
  const overlap = 1;
  const step = batchSize - overlap;
  const allSnapped: [number, number][] = [];

  for (let i = 0; i < coords.length; i += step) {
    const end = Math.min(i + batchSize, coords.length);
    const batch = coords.slice(i, end);
    const coordStr = batch.map((c) => `${c[0]},${c[1]}`).join(";");

    const url = `${MATCHING_API}/${coordStr}?geometries=geojson&overview=full&tidy=true&access_token=${MAPBOX_ACCESS_TOKEN}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Map Matching API error: ${res.status}`);
      const data = await res.json();

      if (data.matchings && data.matchings.length > 0) {
        const snapped = data.matchings[0].geometry.coordinates as [number, number][];
        if (i > 0 && snapped.length > 1) {
          allSnapped.push(...snapped.slice(1));
        } else {
          allSnapped.push(...snapped);
        }
      } else {
        allSnapped.push(...chaikinSmooth(batch));
      }
    } catch (e) {
      console.error("Map Matching API failed:", e);
      allSnapped.push(...chaikinSmooth(batch));
    }
  }

  return allSnapped;
}

