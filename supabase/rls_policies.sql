-- ============================================================
-- RLS Policies for Trace app
-- Run this once in the Supabase SQL editor AFTER running
-- add_visitor_id_to_traces.sql
-- ============================================================

-- ── traces table ─────────────────────────────────────────────

-- Enable RLS
ALTER TABLE traces ENABLE ROW LEVEL SECURITY;

-- Anyone can read any trace (required for shared links)
CREATE POLICY "traces_public_read"
  ON traces FOR SELECT
  USING (true);

-- Anyone can insert a trace (no auth — anon key via server API)
CREATE POLICY "traces_anon_insert"
  ON traces FOR INSERT
  WITH CHECK (true);

-- Only the owner (matching visitor_id) can update
-- Falls back to allowing update if visitor_id is NULL (legacy rows)
CREATE POLICY "traces_owner_update"
  ON traces FOR UPDATE
  USING (
    visitor_id IS NULL
    OR visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id'
  );

-- Only the owner can delete
CREATE POLICY "traces_owner_delete"
  ON traces FOR DELETE
  USING (
    visitor_id IS NULL
    OR visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id'
  );

-- ── comments table ────────────────────────────────────────────

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "comments_public_read"
  ON comments FOR SELECT
  USING (true);

-- Anyone can post a comment
CREATE POLICY "comments_anon_insert"
  ON comments FOR INSERT
  WITH CHECK (true);

-- Only the comment author (matching visitor_id) or the trace owner (matching traces.visitor_id) can update/delete comments
CREATE POLICY "comments_owner_update"
  ON comments FOR UPDATE
  USING (
    visitor_id IS NULL
    OR visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id'
    OR EXISTS (
      SELECT 1 FROM traces
      WHERE traces.id = comments.trace_id
        AND (traces.visitor_id IS NULL OR traces.visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id')
    )
  );

CREATE POLICY "comments_owner_delete"
  ON comments FOR DELETE
  USING (
    visitor_id IS NULL
    OR visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id'
    OR EXISTS (
      SELECT 1 FROM traces
      WHERE traces.id = comments.trace_id
        AND (traces.visitor_id IS NULL OR traces.visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id')
    )
  );

-- ── trace-media storage bucket ────────────────────────────────
-- Since you are NOT using Supabase Auth, requests from the Next.js API
-- routes run using the 'anon' role (via NEXT_PUBLIC_SUPABASE_ANON_KEY).
--
-- Therefore, the storage bucket policies must allow the 'public' (anon)
-- role to INSERT and UPDATE (for upsert). If you restrict it to 'authenticated',
-- uploads will fail.
--
-- Note: You should enable Row Level Security (RLS) on storage.objects.
-- This can be pasted directly in the Supabase SQL editor:

-- Allow public read of files in trace-media
CREATE POLICY "trace_media_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'trace-media');

-- Allow anon upload/insert of files to trace-media
CREATE POLICY "trace_media_anon_insert"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'trace-media');

-- Allow anon update/overwrite of files in trace-media
CREATE POLICY "trace_media_anon_update"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'trace-media');

