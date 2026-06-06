"use client";

import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import TraceCard from "./TraceCard";

const recentTraces = [
    { id: 1, title: "Wedding Hall", owner: "Sarah", date: "June 5, 2026" },
    { id: 2, title: "Concert Meetup", owner: "David", date: "June 4, 2026" },
];

const Main = () => {
    const router = useRouter();
    const toast = useToast();
    const [myTraces, setMyTraces] = useState<{ id: string; title: string; link: string; date: string; }[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("saved_traces");
        if (stored) {
            try {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setMyTraces(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse saved traces", e);
            }
        }
        setIsLoaded(true);
    }, []);

    const handleNewTrace = () => {
        const newId = Math.random().toString(36).substring(2, 9);
        router.push(`/trace/${newId}`);
    };

    return (
        <main className="min-h-screen bg-[#f3f3f1] text-black pb-24">
            <div className="max-w-4xl mx-auto px-6 pt-8">

                {/* Top Header Section */}
                <div className="flex items-end justify-between mb-14">
                    <div>
                        <h1 className="text-[2.5rem] leading-none tracking-[-0.06em] font-semibold">
                            Trace
                        </h1>
                        <p className="mt-3 text-[15px] text-black/45 max-w-sm leading-relaxed">
                            Walk routes once and share them with anyone.
                        </p>
                    </div>

                    <Button
                        onClick={handleNewTrace}
                        className="rounded-[16px] px-6 h-12 flex items-center gap-2 shadow-none hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4 shrink-0" />

                        <span className="font-medium leading-none">
                            New Trace
                        </span>
                    </Button>
                </div>

                {/* My Traces */}
                <section className="mb-14">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-[1.15rem] font-semibold tracking-tight">My Traces</h2>
                            <p className="text-sm text-black/35 mt-1">Your saved routes</p>
                        </div>
                        {isLoaded && <p className="text-sm text-black/25">{myTraces.length}</p>}
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
                                        onShare={() => {
                                            navigator.clipboard.writeText(trace.link);
                                            toast.success("Link Copied", "Trace link copied to clipboard.");
                                        }}
                                        onClick={() => router.push(`/trace/${trace.id}`)}
                                    />
                                ))
                            ) : (
                                <div className="p-8 rounded-[24px] border border-dashed border-black/10 bg-white/50 text-center">
                                    <p className="text-sm text-black/40 font-medium">
                                        No saved traces yet. Click &quot;New Trace&quot; above to start recording.
                                    </p>
                                </div>
                            )
                        ) : (
                            <div className="space-y-4 animate-pulse">
                                <div className="w-full h-[82px] bg-black/[0.03] rounded-[24px] border border-black/[0.02]" />
                            </div>
                        )}
                    </div>
                </section>

                {/* Recent Viewed */}
                <section>
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-[1.15rem] font-semibold tracking-tight">Recent Viewed</h2>
                            <p className="text-sm text-black/35 mt-1">Traces shared with you</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {recentTraces.map((trace) => (
                            <TraceCard
                                key={trace.id}
                                title={trace.title}
                                link={`Shared by ${trace.owner}`}
                                date={trace.date}
                                isRecent
                                onShare={() => console.log("Share", trace.id)}
                                onClick={() => router.push(`/trace/${trace.id}`)}
                            />
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
};

export default Main;
