import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const supabase = getSupabaseClient();
  const visitorId = request.headers.get("x-visitor-id");
  try {
    const { id, commentId } = await params;

    if (!id || !commentId) {
      return NextResponse.json(
        { error: "Missing trace ID or comment ID" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("trace_id", id);

    if (visitorId) {
      query = query.setHeader("x-visitor-id", visitorId);
    }

    const { error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

