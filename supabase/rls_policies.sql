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

-- Only the comment author (matching visitor_id) can update/delete
CREATE POLICY "comments_owner_update"
  ON comments FOR UPDATE
  USING (
    visitor_id IS NULL
    OR visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id'
  );

CREATE POLICY "comments_owner_delete"
  ON comments FOR DELETE
  USING (
    visitor_id IS NULL
    OR visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id'
  );

-- ── trace-media storage bucket ────────────────────────────────
-- NOTE: Storage policies are set via the Supabase dashboard UI
-- or using the storage API, not raw SQL.
--
-- In Supabase dashboard → Storage → trace-media → Policies:
--
-- 1. SELECT (read): Allow for all  → everyone can read files (public bucket)
-- 2. INSERT (upload): Allow for authenticated role only
--    → Since you use the service/anon key server-side, this is fine.
--    → Prevents direct browser-side uploads bypassing your /api/upload route.
--
-- If you want to set this via SQL instead:
-- INSERT INTO storage.policies (name, bucket_id, operation, definition)
-- VALUES
--   ('trace-media-public-read', 'trace-media', 'SELECT', 'true'),
--   ('trace-media-server-insert', 'trace-media', 'INSERT', 'true');
-- (The bucket being PUBLIC already handles SELECT; focus on INSERT restriction)
