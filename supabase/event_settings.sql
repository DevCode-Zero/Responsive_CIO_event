-- Create event_settings table for storing event-wide settings

CREATE TABLE IF NOT EXISTS event_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  featured_speaker_name TEXT DEFAULT 'Dr. Sarah Mitchell',
  featured_speaker_company TEXT DEFAULT 'CIO, GlobalTech Industries',
  featured_speaker_bio TEXT DEFAULT 'Transforming Enterprise Technology: Lessons from a Billion-Dollar Journey',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO event_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE event_settings;
