"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import TraceCard from "./TraceCard";
import CommentSlideOver from "./CommentSlideOver";
import NameModal from "@/components/trace/NameModal";

const recentTraces = [
    { id: "1", title: "Wedding Hall", owner: "Sarah", date: "June 5, 2026", link: "Shared by Sarah" },
    { id: "2", title: "Concert Meetup", owner: "David", date: "June 4, 2026", link: "Shared by David" },
];

const Main = () => {
    const router = useRouter();
    const toast = useToast();
    const [myTraces, setMyTraces] = useState<{ id: string; title: string; link: string; date: string; distance?: string; commentCount?: number; }[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Multi-Select States
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Comment slide-over state
    const [commentTraceId, setCommentTraceId] = useState<string | null>(null);
    const [showCommentSlideOver, setShowCommentSlideOver] = useState(false);
    const [showDashNameModal, setShowDashNameModal] = useState(false);
    const [dashVisitorName, setDashVisitorName] = useState<string | null>(null);
    const [pendingCommentTraceId, setPendingCommentTraceId] = useState<string | null>(null);

    useEffect(() => {
      const storedName = localStorage.getItem("visitor_name");
      if (storedName) setDashVisitorName(storedName);
      if (!localStorage.getItem("visitor_id")) {
        localStorage.setItem("visitor_id", `v_${Math.random().toString(36).substring(2, 10)}`);
      }
    }, []);

    useEffect(() => {
        async function fetchTraces() {
            const stored = localStorage.getItem("saved_traces");
            if (!stored) {
                setIsLoaded(true);
                return;
            }

            try {
                const localTraces = JSON.parse(stored) as { id: string; title: string; link: string; date: string; }[];
                const ids = localTraces.map((t) => t.id);

                if (ids.length === 0) {
                    setIsLoaded(true);
                    return;
                }

                // Try fetching latest metadata from Supabase bulk endpoint
                const res = await fetch("/api/trace/list", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids }),
                });

                if (res.ok) {
                    const result = await res.json();
                    if (result.success && result.data) {
                        // Re-map links since database stores metadata
                        const serverTraces = result.data.map((t: any) => ({
                            id: t.id,
                            title: t.title,
                            link: `${window.location.origin}/trace/${t.id}`,
                            date: t.date,
                            distance: t.distance,
                            commentCount: t.comment_count ?? 0,
                        }));
                        setMyTraces(serverTraces);
                        setIsLoaded(true);
                        return;
                    }
                }

                // Fallback to local storage if API call fails — fetch comment counts separately
                try {
                    const countRes = await fetch("/api/trace/list/comments/counts", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ids }),
                    });
                    if (countRes.ok) {
                        const countResult = await countRes.json();
                        if (countResult.success) {
                            const merged = localTraces.map((t: any) => ({
                                ...t,
                                commentCount: countResult.data[t.id] || 0,
                            }));
                            setMyTraces(merged);
                            return;
                        }
                    }
                } catch {}
                setMyTraces(localTraces);
            } catch (e) {
                console.error("Failed loading traces:", e);
                // Last-resort fallback
                try {
                    setMyTraces(JSON.parse(stored));
                } catch {}
            }
            setIsLoaded(true);
        }

        fetchTraces();
    }, []);

    const handleNewTrace = () => {
        const newId = Math.random().toString(36).substring(2, 9);
        router.push(`/trace/${newId}`);
    };

    const handleCommentClick = (traceId: string) => {
        setPendingCommentTraceId(traceId);
        const storedName = localStorage.getItem("visitor_name");
        if (storedName) {
            setDashVisitorName(storedName);
            setCommentTraceId(traceId);
            setShowCommentSlideOver(true);
        } else {
            setShowDashNameModal(true);
        }
    };

    const handleDashNameComplete = (name: string) => {
        setDashVisitorName(name);
        setShowDashNameModal(false);
        if (pendingCommentTraceId) {
            setCommentTraceId(pendingCommentTraceId);
            setShowCommentSlideOver(true);
        }
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

    // Selection handlers
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

        // 1. Optimistic local state update
        setMyTraces((prev) => prev.filter((t) => !idsToDelete.includes(t.id)));

        // 2. Remove from localStorage
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

        // 3. Remove from Supabase
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
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
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

                {/* My Traces */}
                <section className="mb-14">
                    <div className="flex items-center justify-between mb-5 select-none">
                        <div>
                            <h2 className="text-[1.15rem] font-bold tracking-tight">My Traces</h2>
                            <p className="text-sm text-black/35 font-medium mt-1 tracking-tight">Your saved routes</p>
                        </div>
                        {isLoaded && <p className="text-sm text-black/25 font-semibold">{myTraces.length}</p>}
                    </div>

                    <div className="space-y-4">
                        {isLoaded ? (
                            myTraces.length > 0 ? (
                                myTraces.map((trace) => (
                                    <TraceCard
                                        key={trace.id}
                                        title={trace.title}
                                        link={trace.link}
                                        date={trace.date}
                                        commentCount={trace.commentCount}
                                        distance={trace.distance}
                                        isSelectMode={isSelectMode}
                                        isSelected={selectedIds.includes(trace.id)}
                                        onSelectToggle={() => toggleSelectId(trace.id)}
                                        onLongPress={() => handleLongPress(trace.id)}
                                        onDelete={() => handleDeleteTraces([trace.id])}
                                        onRename={(newTitle) => handleRenameTrace(trace.id, newTitle)}
                                        onShare={() => {
                                            navigator.clipboard.writeText(trace.link);
                                            toast.success("Link Copied", "Trace link copied to clipboard.");
                                        }}
                                        onClick={() => router.push(`/trace/${trace.id}`)}
                                        onCommentClick={() => handleCommentClick(trace.id)}
                                    />
                                ))
                            ) : (
                                <div className="p-8 rounded-[24px] border border-dashed border-black/10 bg-white/50 text-center select-none">
                                    <p className="text-sm text-black/40 font-medium">
                                        No saved traces yet. Click &quot;New Trace&quot; above to start recording.
                                    </p>
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
                                            <div className="w-10 h-10 rounded-full bg-black/[0.04]" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Recent Viewed */}
                <section>
                    <div className="flex items-center justify-between mb-5 select-none">
                        <div>
                            <h2 className="text-[1.15rem] font-bold tracking-tight">Recent Viewed</h2>
                            <p className="text-sm text-black/35 font-medium mt-1 tracking-tight">Traces shared with you</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {!isLoaded ? (
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="w-full flex items-center justify-between p-5 rounded-[24px] border border-black/[0.05] bg-[#efefec] animate-pulse">
                                        <div className="flex items-center min-w-0 flex-1">
                                            <div className="min-w-0 flex-1">
                                                <div className="h-4 w-2/5 bg-black/[0.06] rounded-full" />
                                                <div className="flex items-center gap-3 mt-3">
                                                    <div className="h-3 w-1/3 bg-black/[0.04] rounded-full" />
                                                    <div className="h-3 w-14 bg-black/[0.04] rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                            <div className="w-10 h-10 rounded-full bg-black/[0.04]" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            recentTraces.map((trace) => (
                                <TraceCard
                                    key={trace.id}
                                    title={trace.title}
                                    link={trace.link}
                                    date={trace.date}
                                    isRecent
                                    onShare={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/trace/${trace.id}`);
                                        toast.success("Link Copied", "Trace link copied to clipboard.");
                                    }}
                                    onClick={() => router.push(`/trace/${trace.id}`)}
                                />
                            ))
                        )}
                    </div>
                </section>
            </div>

            {/* Comment slide-over */}
            <CommentSlideOver
                traceId={commentTraceId || ""}
                traceTitle={myTraces.find((t) => t.id === commentTraceId)?.title || ""}
                isAuthor={commentTraceId ? myTraces.some((t) => t.id === commentTraceId) : false}
                isOpen={showCommentSlideOver && !!commentTraceId}
                onClose={() => setShowCommentSlideOver(false)}
                onNameRequired={() => {
                    setShowCommentSlideOver(false);
                    setShowDashNameModal(true);
                }}
                onCommentAdded={() => {
                    if (commentTraceId) {
                        setMyTraces((prev) => prev.map((t) =>
                            t.id === commentTraceId
                                ? { ...t, commentCount: (t.commentCount || 0) + 1 }
                                : t
                        ));
                    }
                }}
                visitorName={dashVisitorName}
            />

            {/* Name modal for first-time commenters */}
            <NameModal
                isOpen={showDashNameModal}
                onComplete={handleDashNameComplete}
                title="What should we call you?"
            />
        </main>
    );
};

export default Main;
