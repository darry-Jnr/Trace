import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  const supabase = getSupabaseClient();
  try {
    const { searchParams } = new URL(request.url);
    const visitor_id = searchParams.get("visitor_id");

    if (!visitor_id) {
      return NextResponse.json({ error: "Missing visitor_id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("traces")
      .select("id, title, link, distance, date")
      .eq("visitor_id", visitor_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
