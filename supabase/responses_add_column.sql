-- Add attendee_name column to responses table

ALTER TABLE responses ADD COLUMN IF NOT EXISTS attendee_name TEXT;