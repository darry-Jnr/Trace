import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Missing or invalid ids parameter" }, { status: 400 });
    }

    if (ids.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data, error } = await supabase
      .from("traces")
      .select("id, title, link, distance, date")
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch comment counts for these traces
    const { data: commentCounts, error: countError } = await supabase
      .from("comments")
      .select("trace_id")
      .in("trace_id", ids);

    const countMap: Record<string, number> = {};
    if (!countError && commentCounts) {
      for (const c of commentCounts) {
        countMap[c.trace_id] = (countMap[c.trace_id] || 0) + 1;
      }
    }

    const enriched = data.map((trace) => ({
      ...trace,
      comment_count: countMap[trace.id] || 0,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
