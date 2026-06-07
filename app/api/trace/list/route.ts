import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: Request) {
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
      .select("id, title, distance, date")
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
