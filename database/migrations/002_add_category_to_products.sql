-- Add category column to parcel_in table
ALTER TABLE parcel_in ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Add category column to parcel_out table  
ALTER TABLE parcel_out ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Create index for faster category queries
CREATE INDEX IF NOT EXISTS idx_parcel_in_category ON parcel_in(category);
CREATE INDEX IF NOT EXISTS idx_parcel_out_category ON parcel_out(category);

-- Add check constraint for valid categories (drop if exists first)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_category_in') THEN
        ALTER TABLE parcel_in ADD CONSTRAINT check_category_in 
        CHECK (category IN ('Component', 'Product', 'Tool', 'Others'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_category_out') THEN
        ALTER TABLE parcel_out ADD CONSTRAINT check_category_out 
        CHECK (category IN ('Component', 'Product', 'Tool', 'Others'));
    END IF;
END $$;

-- Update existing records to have default category
UPDATE parcel_in SET category = 'Others' WHERE category IS NULL;
UPDATE parcel_out SET category = 'Others' WHERE category IS NULL;
