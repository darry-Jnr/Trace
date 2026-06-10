# Trace

**Show people exactly where to go.**

Walk a route once, drop waypoints (text notes, voice memos, photos), and share a single link. Followers replay your route with proximity-based guidance — they'll know when they're on track, when they've arrived, and what to look for at each stop.

Built with Next.js 16, Mapbox GL JS, and Supabase.

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public access token |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous API key |

### Database

Run the SQL migrations in `supabase/` against your Supabase project to create the required tables and storage buckets:

- `supabase/migration_comments.sql` — creates the `comments` table with RLS policies
- A `traces` table and `trace-media` storage bucket also need to be created (schema not yet migrated to SQL)

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Maps:** Mapbox GL JS v3 via react-map-gl v8
- **Backend:** Supabase (PostgreSQL + Storage)
- **Styling:** Tailwind CSS v4
- **Analytics:** Pendo
