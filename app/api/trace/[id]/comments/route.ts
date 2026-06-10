import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing trace ID" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("trace_id", id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, count: data.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { author_name, content, visitor_id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing trace ID" }, { status: 400 });
    }

    if (!author_name || !content) {
      return NextResponse.json(
        { error: "Missing required fields: author_name, content" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        trace_id: id,
        author_name,
        content,
        visitor_id: visitor_id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
