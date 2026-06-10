-- Comments table for Trace
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  visitor_id TEXT,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by trace
CREATE INDEX IF NOT EXISTS idx_comments_trace_id ON comments (trace_id);

-- Enable Row Level Security (optional, disabled by default)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (no auth)
CREATE POLICY "Public read" ON comments FOR SELECT USING (true);
CREATE POLICY "Public insert" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON comments FOR UPDATE USING (true);
