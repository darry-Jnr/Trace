"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const pendingDeletionsRef = useRef<Map<string, { trace: TraceItem; timer: ReturnType<typeof setTimeout> }>>(new Map());

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
      const visitorId = localStorage.getItem("visitor_id");

      let owned: TraceItem[] = [];
      let shared: TraceItem[] = [];

      // Parse owned traces from localStorage
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

      // Recover ownership from Supabase by visitor_id
      // Fills the gap if localStorage was cleared but traces still exist server-side
      if (visitorId) {
        try {
          const res = await fetch(`/api/trace/mine?visitor_id=${encodeURIComponent(visitorId)}`);
          if (res.ok) {
            const result = await res.json();
            if (result.success && Array.isArray(result.data)) {
              const ownedIds = new Set(owned.map((t) => t.id));
              const recovered = result.data
                .filter((t: any) => !ownedIds.has(t.id))
                .map((t: any) => ({
                  id: t.id,
                  title: t.title,
                  link: `${window.location.origin}/trace/${t.id}`,
                  date: t.date,
                  distance: t.distance,
                  isOwner: true,
                }));

              // Also re-sync recovered traces back to localStorage
              if (recovered.length > 0) {
                try {
                  const existing = JSON.parse(localStorage.getItem("saved_traces") || "[]");
                  const existingIds = new Set(existing.map((t: any) => t.id));
                  const toAdd = recovered.filter((t: TraceItem) => !existingIds.has(t.id));
                  if (toAdd.length > 0) {
                    localStorage.setItem(
                      "saved_traces",
                      JSON.stringify([...toAdd, ...existing])
                    );
                  }
                } catch {}
                owned = [...owned, ...recovered];
              }
            }
          }
        } catch (e) {
          console.error("Failed recovering traces from Supabase:", e);
        }
      }

      // Parse recently viewed (shared traces — traces you opened via someone else's link)
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

  const handleDeleteTraces = (idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return;

    // Save traces for potential undo
    const tracesToDelete = myTraces.filter((t) => idsToDelete.includes(t.id));

    // Optimistic removal
    setMyTraces((prev) => prev.filter((t) => !idsToDelete.includes(t.id)));

    const label = idsToDelete.length === 1 ? "Trace deleted" : `${idsToDelete.length} traces deleted`;

    toast.success(
      label,
      undefined,
      5000,
      {
        label: "Undo",
        onClick: () => {
          // Cancel pending deletions and restore
          for (const id of idsToDelete) {
            const pending = pendingDeletionsRef.current.get(id);
            if (pending) {
              clearTimeout(pending.timer);
              pendingDeletionsRef.current.delete(id);
            }
          }
          setMyTraces((prev) => {
            const restored = tracesToDelete.filter((t) => !prev.some((p) => p.id === t.id));
            return [...prev, ...restored].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          });
        },
      }
    );

    // Schedule actual deletion after 5s
    for (const trace of tracesToDelete) {
      const timer = setTimeout(async () => {
        pendingDeletionsRef.current.delete(trace.id);

        // Remove from localStorage
        try {
          const stored = localStorage.getItem("saved_traces");
          if (stored) {
            const localTraces = JSON.parse(stored);
            const updated = localTraces.filter((t: { id: string }) => t.id !== trace.id);
            localStorage.setItem("saved_traces", JSON.stringify(updated));
          }
        } catch (e) {
          console.error("LocalStorage delete error:", e);
        }

        // Delete from Supabase
        try {
          await fetch(`/api/trace/${trace.id}`, { method: "DELETE" });
        } catch (err) {
          console.error("Supabase deletion error:", err);
        }
      }, 5000);

      pendingDeletionsRef.current.set(trace.id, { trace, timer });
    }

    cancelSelection();
  };

  const countLabel = filteredTraces.length === 1 ? "1 trace" : `${filteredTraces.length} traces`;

  return (
    <main className="min-h-screen bg-[#f3f3f1] text-black pb-24 font-sans">
      <div className="max-w-4xl mx-auto px-6 pt-6 sm:pt-8">

        {/* Header Action Row */}
        {isSelectMode ? (
          <div className="flex items-center justify-between mb-6 bg-white/70 backdrop-blur-2xl border border-black/[0.05] px-6 py-4 rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] animate-fade-in select-none">
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
        ) : null}

        {/* Filter + Actions Row */}
        {!isSelectMode && (
          <div className="flex items-center justify-between mb-6 select-none">
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-black/15 bg-transparent text-[13px] font-medium tracking-tight text-black/60 hover:text-black/80 hover:border-black/30 active:scale-95 transition-all cursor-pointer"
              >
                <span className="capitalize">{filter}</span>
                <ChevronDown className="w-3 h-3 text-black/30" />
              </button>

              {filterOpen && (
                <div className="absolute left-0 top-full mt-1 w-28 bg-white rounded-xl border border-black/[0.05] shadow-[0_10px_40px_rgba(0,0,0,0.12)] py-1.5 z-50 animate-fade-in">
                  {(["all", "mine", "shared"] as FilterTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setFilter(tab); setFilterOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium transition-colors ${
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

            <div className="flex items-center gap-3">
              {isLoaded && (
                <p className="text-[12px] text-black/25 font-medium">{countLabel}</p>
              )}
              <button
                onClick={handleNewTrace}
                className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center hover:scale-[1.04] active:scale-95 transition-all cursor-pointer shadow-sm"
                title="New Trace"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Trace List */}
        <section>
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
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center select-none">
                  {filter === "shared" ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-black/[0.04] flex items-center justify-center mb-4">
                        <svg className="w-5 h-5 text-black/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <p className="text-sm text-black/40 font-medium">
                        No recently viewed traces. Open a shared link to see it here.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-black/[0.04] flex items-center justify-center mb-5">
                        <svg className="w-6 h-6 text-black/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                      </div>
                      <p className="text-[15px] text-black/40 font-medium leading-relaxed max-w-[260px]">
                        {filter === "mine" ? "Start your first trace" : "No traces yet"}
                      </p>
                      <p className="mt-1 text-[13px] text-black/30 font-medium max-w-[260px]">
                        Walk a route, drop moments along the way, and share it with anyone.
                      </p>
                      <button
                        onClick={handleNewTrace}
                        className="mt-7 h-11 px-6 rounded-xl bg-black text-white text-[13px] font-semibold flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        New Trace
                      </button>
                    </>
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
