-- Migration: add visitor_id ownership column to traces
-- Run this once in the Supabase SQL editor

ALTER TABLE traces ADD COLUMN IF NOT EXISTS visitor_id text;

-- Optional: index for fast lookups by visitor
CREATE INDEX IF NOT EXISTS traces_visitor_id_idx ON traces (visitor_id);
