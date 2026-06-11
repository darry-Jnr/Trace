export type LoadingStage = "booting" | "searching" | "improving" | "done";
export type ViewMode = "flat" | "tilted";

export interface WaypointMedia {
  id: string;
  type: "text" | "image" | "voice";
  content: string;
  category: string;
  coordinates: [number, number];
  fileUrl?: string;
}

export interface WaypointGroup {
  id: string;
  coordinates: [number, number];
  items: WaypointMedia[];
}

export function groupWaypoints(waypoints: WaypointMedia[]): WaypointGroup[] {
  const groups: WaypointGroup[] = [];
  for (const wp of waypoints) {
    const existing = groups.find((g) => {
      const dx = g.coordinates[0] - wp.coordinates[0];
      const dy = g.coordinates[1] - wp.coordinates[1];
      return Math.abs(dx) < 0.00015 && Math.abs(dy) < 0.00015;
    });
    if (existing) {
      existing.items.push(wp);
    } else {
      groups.push({ id: wp.id, coordinates: wp.coordinates, items: [wp] });
    }
  }
  return groups;
}

export const CACHE_KEY = "trace_last_known_location";
