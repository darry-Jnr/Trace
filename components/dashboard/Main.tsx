"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2, Filter, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import TraceCard from "./TraceCard";

type FilterTab = "all" | "mine" | "shared";

interface TraceItem {
  id: string;
  title: string;
  link: string;
  date: string;
  distance?: string;
  isOwner: boolean;
}

const Main = () => {
  const router = useRouter();
  const toast = useToast();
  const [myTraces, setMyTraces] = useState<TraceItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    if (filterOpen) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [filterOpen]);

  useEffect(() => {
    if (!localStorage.getItem("visitor_id")) {
      localStorage.setItem("visitor_id", `v_${Math.random().toString(36).substring(2, 10)}`);
    }
  }, []);

  useEffect(() => {
    async function fetchTraces() {
      const stored = localStorage.getItem("saved_traces");
      const recentRaw = localStorage.getItem("recently_viewed");

      let owned: TraceItem[] = [];
      let shared: TraceItem[] = [];

      // Parse owned traces
      if (stored) {
        try {
          const localTraces = JSON.parse(stored) as { id: string; title: string; link: string; date: string; distance?: string }[];
          const ids = localTraces.map((t) => t.id);

          if (ids.length > 0) {
            const res = await fetch("/api/trace/list", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids }),
            });

            if (res.ok) {
              const result = await res.json();
              if (result.success && result.data) {
                owned = result.data.map((t: any) => ({
                  id: t.id,
                  title: t.title,
                  link: `${window.location.origin}/trace/${t.id}`,
                  date: t.date,
                  distance: t.distance,
                  isOwner: true,
                }));
              } else {
                owned = localTraces.map((t) => ({ ...t, isOwner: true }));
              }
            } else {
              owned = localTraces.map((t) => ({ ...t, isOwner: true }));
            }
          }
        } catch (e) {
          console.error("Failed loading owned traces:", e);
        }
      }

      // Parse recently viewed (shared traces)
      if (recentRaw) {
        try {
          const parsed = JSON.parse(recentRaw) as { id: string; title: string; date: string; distance?: string }[];
          shared = parsed.map((t) => ({
            ...t,
            link: `${window.location.origin}/trace/${t.id}`,
            isOwner: false,
          }));
        } catch (e) {
          console.error("Failed loading recently viewed:", e);
        }
      }

      // Dedupe: if a trace is in both owned and shared, keep the owned version
      const ownedIds = new Set(owned.map((t) => t.id));
      const merged = [...owned, ...shared.filter((t) => !ownedIds.has(t.id))];

      // Sort by date descending (newest first)
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setMyTraces(merged);
      setIsLoaded(true);
    }

    fetchTraces();
  }, []);

  const filteredTraces = useMemo(() => {
    switch (filter) {
      case "mine":
        return myTraces.filter((t) => t.isOwner);
      case "shared":
        return myTraces.filter((t) => !t.isOwner);
      default:
        return myTraces;
    }
  }, [myTraces, filter]);

  const ownerTraceIds = useMemo(() => new Set(myTraces.filter((t) => t.isOwner).map((t) => t.id)), [myTraces]);

  const handleNewTrace = () => {
    const newId = Math.random().toString(36).substring(2, 9);
    router.push(`/trace/${newId}`);
  };

  const handleRenameTrace = (traceId: string, newTitle: string) => {
    setMyTraces((prev) => prev.map((t) => t.id === traceId ? { ...t, title: newTitle } : t));
    try {
      const stored = localStorage.getItem("saved_traces");
      if (stored) {
        const localTraces = JSON.parse(stored);
        const updated = localTraces.map((t: { id: string; title: string }) =>
          t.id === traceId ? { ...t, title: newTitle } : t
        );
        localStorage.setItem("saved_traces", JSON.stringify(updated));
      }
    } catch (e) {
      console.error("LocalStorage rename error:", e);
    }
    fetch(`/api/trace/${traceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    }).catch((e) => console.error("Supabase rename error:", e));
    toast.success("Renamed", `Trace renamed to "${newTitle}".`);
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleLongPress = (id: string) => {
    setIsSelectMode(true);
    setSelectedIds([id]);
    toast.info("Selection Mode", "Select trace items to delete.");
  };

  const cancelSelection = () => {
    setIsSelectMode(false);
    setSelectedIds([]);
  };

  const handleDeleteTraces = async (idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return;

    const confirmText = idsToDelete.length === 1
      ? "Are you sure you want to delete this trace? It will be removed from local storage and the database."
      : `Are you sure you want to delete these ${idsToDelete.length} traces? They will be removed from local storage and the database.`;

    if (!confirm(confirmText)) return;

    setMyTraces((prev) => prev.filter((t) => !idsToDelete.includes(t.id)));

    try {
      const stored = localStorage.getItem("saved_traces");
      if (stored) {
        const localTraces = JSON.parse(stored);
        const updated = localTraces.filter((t: { id: string }) => !idsToDelete.includes(t.id));
        localStorage.setItem("saved_traces", JSON.stringify(updated));
      }
    } catch (e) {
      console.error("LocalStorage delete error:", e);
    }

    try {
      await Promise.all(
        idsToDelete.map((id) =>
          fetch(`/api/trace/${id}`, { method: "DELETE" })
        )
      );
      toast.success("Traces Deleted", "The selected trace records have been deleted successfully.");
    } catch (err) {
      console.error("Supabase deletion error:", err);
      toast.error("Database Delete Failed", "Trace could not be deleted from the server database.");
    }

    cancelSelection();
  };

  const countLabel = filteredTraces.length === 1 ? "1 trace" : `${filteredTraces.length} traces`;

  return (
    <main className="min-h-screen bg-[#f3f3f1] text-black pb-24 font-sans">
      <div className="max-w-4xl mx-auto px-6 pt-8">

        {/* Header Action Row */}
        {isSelectMode ? (
          <div className="flex items-center justify-between mb-14 bg-white/70 backdrop-blur-2xl border border-black/[0.05] px-6 py-4 rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] animate-fade-in select-none">
            <div className="flex items-center gap-3">
              <span className="text-[15px] font-bold text-black tracking-tight">
                {selectedIds.length} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelSelection}
                className="px-4.5 h-10 rounded-xl bg-black/[0.03] hover:bg-black/[0.06] text-black font-semibold text-xs active:scale-95 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTraces(selectedIds)}
                className="px-4.5 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-xs active:scale-95 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
            <div>
              <h1 className="text-[2.5rem] leading-none tracking-[-0.06em] font-bold">
                Trace
              </h1>
              <p className="mt-3 text-[15px] text-black/45 max-w-sm leading-relaxed font-medium tracking-tight">
                Walk routes once and share them with anyone.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleNewTrace}
                className="rounded-[16px] px-6 h-12 flex items-center gap-2 shadow-none hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="font-semibold leading-none">
                  New Trace
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* Trace List */}
        <section>
          {!isSelectMode && isLoaded && (
            <div className="flex items-center justify-between mb-5 select-none">
              <h2 className="text-[1.15rem] font-bold tracking-tight">
                {filter === "all" ? "All Traces" : filter === "mine" ? "My Traces" : "Shared Traces"}
              </h2>
              <p className="text-sm text-black/25 font-semibold">{countLabel}</p>
            </div>
          )}

          {!isSelectMode && (
            <div className="flex justify-end mb-5 select-none" ref={filterRef}>
              <div className="relative">
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className="flex items-center gap-1.5 px-3.5 h-8 rounded-full border border-black/15 bg-transparent text-[12px] font-semibold tracking-tight text-black/60 hover:text-black/80 hover:border-black/30 active:scale-95 transition-all cursor-pointer"
                >
                  <Filter className="w-3 h-3" />
                  <span className="capitalize">{filter}</span>
                  <ChevronDown className="w-3 h-3 text-black/30" />
                </button>

                {filterOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-32 bg-white rounded-2xl border border-black/[0.05] shadow-[0_10px_40px_rgba(0,0,0,0.12)] py-2 z-50 animate-fade-in">
                    {(["all", "mine", "shared"] as FilterTab[]).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => { setFilter(tab); setFilterOpen(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                          filter === tab
                            ? "text-black bg-black/[0.03]"
                            : "text-black/50 hover:text-black/70 hover:bg-black/[0.03]"
                        }`}
                      >
                        <span className="capitalize">{tab}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {isLoaded ? (
              filteredTraces.length > 0 ? (
                filteredTraces.map((trace) => {
                  const isOwnerSelected = ownerTraceIds.has(trace.id);
                  return (
                    <TraceCard
                      key={trace.id}
                      title={trace.title}
                      link={trace.link}
                      date={trace.date}
                      distance={trace.distance}
                      isOwner={trace.isOwner}
                      isSelectMode={isSelectMode && isOwnerSelected}
                      isSelected={selectedIds.includes(trace.id)}
                      onSelectToggle={() => toggleSelectId(trace.id)}
                      onLongPress={() => isOwnerSelected && handleLongPress(trace.id)}
                      onDelete={() => isOwnerSelected && handleDeleteTraces([trace.id])}
                      onRename={(newTitle) => isOwnerSelected && handleRenameTrace(trace.id, newTitle)}
                      onShare={() => {
                        navigator.clipboard.writeText(trace.link);
                        toast.success("Link Copied", "Trace link copied to clipboard.");
                      }}
                      onClick={() => router.push(`/trace/${trace.id}`)}
                    />
                  );
                })
              ) : (
                <div className="p-8 rounded-[24px] border border-dashed border-black/10 bg-white/50 text-center select-none">
                  {filter === "mine" ? (
                    <p className="text-sm text-black/40 font-medium">
                      No saved traces yet. Click &quot;New Trace&quot; above to start recording.
                    </p>
                  ) : filter === "shared" ? (
                    <p className="text-sm text-black/40 font-medium">
                      No recently viewed traces. Open a shared link to see it here.
                    </p>
                  ) : (
                    <p className="text-sm text-black/40 font-medium">
                      No traces yet. Click &quot;New Trace&quot; above to start recording.
                    </p>
                  )}
                </div>
              )
            ) : (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-full flex items-center justify-between p-5 rounded-[24px] border border-black/[0.05] bg-white animate-pulse">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="h-4 w-3/5 bg-black/[0.06] rounded-full" />
                        <div className="flex items-center gap-3 mt-3">
                          <div className="h-3 w-2/5 bg-black/[0.04] rounded-full" />
                          <div className="h-3 w-16 bg-black/[0.04] rounded-full" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      <div className="w-10 h-10 rounded-full bg-black/[0.04]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Main;
