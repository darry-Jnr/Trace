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

export const CACHE_KEY = "trace_last_known_location";
