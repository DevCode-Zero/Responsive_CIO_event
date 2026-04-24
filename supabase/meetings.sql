-- Run this in Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  location TEXT,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW()
);