-- Add description column to parcel_in and parcel_out tables
ALTER TABLE IF EXISTS parcel_in ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS parcel_out ADD COLUMN IF NOT EXISTS description TEXT;

-- Backfill existing records with empty description if null
UPDATE parcel_in SET description = '' WHERE description IS NULL;
UPDATE parcel_out SET description = '' WHERE description IS NULL;
