-- Add speaker fields to meetings table

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS speaker_name TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS speaker_company TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS speaker_bio TEXT;