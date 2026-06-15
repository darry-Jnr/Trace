"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import InitialLoader from "@/components/trace/overlays/InitialLoader";
import RecordWorkspace from "./RecordWorkspace";
import ReplayWorkspace from "./ReplayWorkspace";
import { WaypointMedia } from "@/types";

interface TraceData {
  title: string;
  coordinates: [number, number][];
  waypoints: WaypointMedia[];
  distance: string;
  date: string;
  isAuthor: boolean;
}

export default function TraceWorkspacePage() {
  const params = useParams();
  const id = params?.id as string;

  const [checkingState, setCheckingState] = useState(true);
  const [isReplayMode, setIsReplayMode] = useState<boolean | null>(null);
  const [traceData, setTraceData] = useState<TraceData | null>(null);

  useEffect(() => {
    if (!id) return;

    async function evaluateTraceContext() {
      try {
        // 1. Check if user is the author (locally saved in client's dashboard history)
        let localTraces: any[] = [];
        let isAuthor = false;
        try {
          const stored = localStorage.getItem("saved_traces");
          if (stored) {
            localTraces = JSON.parse(stored);
            isAuthor = localTraces.some((t: { id: string }) => t.id === id);
          }
        } catch (e) {
          console.error("Failed to read local traces", e);
        }

        // 2. Try to find the trace in local storage first (instant client load)
        const localTrace = localTraces.find((t: { id: string }) => t.id === id);
        if (localTrace) {
          setTraceData({
            title: localTrace.title || "Unfinished Trail Trace",
            coordinates: localTrace.coordinates || [],
            waypoints: localTrace.waypoints || [],
            distance: localTrace.distance || "0.0 mi",
            date: localTrace.date || "",
            isAuthor,
          });
          setIsReplayMode(true);
          setCheckingState(false);
          return;
        }

        // 3. If not found locally, check the remote database (Supabase)
        const res = await fetch(`/api/trace/${id}`);
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data) {
            const remoteTrace = result.data;
            setTraceData({
              title: remoteTrace.title || "Shared Trail Trace",
              coordinates: remoteTrace.coordinates || [],
              waypoints: remoteTrace.waypoints || [],
              distance: remoteTrace.distance || "0.0 mi",
              date: remoteTrace.date || "",
              isAuthor,
            });

            // Save to recently_viewed dashboard cache
            try {
              const recentRaw = localStorage.getItem("recently_viewed");
              const recent = recentRaw ? JSON.parse(recentRaw) : [];
              const entry = {
                id: remoteTrace.id,
                title: remoteTrace.title,
                date: remoteTrace.date,
                distance: remoteTrace.distance,
              };
              const deduped = recent.filter((r: any) => r.id !== entry.id);
              deduped.unshift(entry);
              localStorage.setItem("recently_viewed", JSON.stringify(deduped.slice(0, 10)));
            } catch (e) {
              console.error("Failed to cache recently viewed trace", e);
            }

            setIsReplayMode(true);
            setCheckingState(false);
            return;
          }
        }

        // 4. Trace does not exist -> Boot fresh workspace in recording mode
        setIsReplayMode(false);
        setCheckingState(false);
      } catch (e) {
        console.error("Error evaluating trace context state:", e);
        // Fallback to recording mode if lookup fails
        setIsReplayMode(false);
        setCheckingState(false);
      }
    }

    evaluateTraceContext();
  }, [id]);

  if (checkingState) {
    return (
      <div className="relative flex w-screen h-screen overflow-hidden bg-[#f5f5f7]">
        <InitialLoader isLoading={true} loadingMessage="Loading workspace..." />
      </div>
    );
  }

  if (isReplayMode && traceData) {
    return <ReplayWorkspace id={id} initialData={traceData} />;
  }

  return <RecordWorkspace id={id} />;
}