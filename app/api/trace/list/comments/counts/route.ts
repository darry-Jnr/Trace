import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: true, data: {} });
    }

    const { data, error } = await supabase
      .from("comments")
      .select("trace_id")
      .in("trace_id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const countMap: Record<string, number> = {};
    if (data) {
      for (const c of data) {
        countMap[c.trace_id] = (countMap[c.trace_id] || 0) + 1;
      }
    }

    return NextResponse.json({ success: true, data: countMap });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
