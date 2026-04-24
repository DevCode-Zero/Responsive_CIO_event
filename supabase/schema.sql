-- Create tables for CIO Event Check-In App

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiple-choice', 'text')),
  options TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'completed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Responses table
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  attendee_id TEXT,
  answer_text TEXT,
  answer_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendees table
CREATE TABLE IF NOT EXISTS attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  company TEXT,
  checked_in_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE questions;
ALTER PUBLICATION supabase_realtime ADD TABLE responses;
ALTER PUBLICATION supabase_realtime ADD TABLE attendees;

-- Create indexes
CREATE INDEX idx_responses_question ON responses(question_id);
CREATE INDEX idx_questions_status ON questions(status);