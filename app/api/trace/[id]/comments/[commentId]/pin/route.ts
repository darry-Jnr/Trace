import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const supabase = getSupabaseClient();
  try {
    const { id, commentId } = await params;

    if (!id || !commentId) {
      return NextResponse.json(
        { error: "Missing trace ID or comment ID" },
        { status: 400 }
      );
    }

    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("is_pinned")
      .eq("id", commentId)
      .eq("trace_id", id)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const newPinned = !comment.is_pinned;

    // If pinning, unpin any other currently pinned comment first
    if (newPinned) {
      const { error: unpinError } = await supabase
        .from("comments")
        .update({ is_pinned: false })
        .eq("trace_id", id)
        .eq("is_pinned", true);

      if (unpinError) {
        return NextResponse.json({ error: unpinError.message }, { status: 500 });
      }
    }

    const { data, error } = await supabase
      .from("comments")
      .update({ is_pinned: newPinned })
      .eq("id", commentId)
      .eq("trace_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
