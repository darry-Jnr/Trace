import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseClient();
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing trace ID" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("traces")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseClient();
  const visitorId = request.headers.get("x-visitor-id");
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing trace ID" }, { status: 400 });
    }

    let query = supabase
      .from("traces")
      .update({ title: body.title })
      .eq("id", id)
      .select();

    if (visitorId) {
      query = query.setHeader("x-visitor-id", visitorId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseClient();
  const visitorId = request.headers.get("x-visitor-id");
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing trace ID" }, { status: 400 });
    }

    let query = supabase
      .from("traces")
      .delete()
      .eq("id", id)
      .select();

    if (visitorId) {
      query = query.setHeader("x-visitor-id", visitorId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

