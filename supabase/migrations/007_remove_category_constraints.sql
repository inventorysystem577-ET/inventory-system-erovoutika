-- Remove category constraints to allow any custom categories
-- This enables users to create and use any category name without database restrictions

DO $$
BEGIN
    -- Drop parcel_in category constraints
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_category_in') THEN
        ALTER TABLE parcel_in DROP CONSTRAINT check_category_in;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_parcel_in_category') THEN
        ALTER TABLE parcel_in DROP CONSTRAINT check_parcel_in_category;
    END IF;
    
    -- Drop parcel_out category constraints
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_category_out') THEN
        ALTER TABLE parcel_out DROP CONSTRAINT check_category_out;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_parcel_out_category') THEN
        ALTER TABLE parcel_out DROP CONSTRAINT check_parcel_out_category;
    END IF;
END $$;

-- Add comment to document the change
COMMENT ON COLUMN parcel_in.category IS 'Item category - now accepts any custom category value';
COMMENT ON COLUMN parcel_out.category IS 'Item category - now accepts any custom category value';
