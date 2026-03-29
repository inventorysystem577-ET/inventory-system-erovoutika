-- Update category constraints to include new categories
-- Drop existing constraints first
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_parcel_in_category') THEN
        ALTER TABLE parcel_in DROP CONSTRAINT check_parcel_in_category;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_parcel_out_category') THEN
        ALTER TABLE parcel_out DROP CONSTRAINT check_parcel_out_category;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_category_in') THEN
        ALTER TABLE parcel_in DROP CONSTRAINT check_category_in;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_category_out') THEN
        ALTER TABLE parcel_out DROP CONSTRAINT check_category_out;
    END IF;
END $$;

-- Add updated constraints with all valid categories including new ones
ALTER TABLE parcel_in ADD CONSTRAINT check_category_in 
CHECK (category IN (
    'Component', 
    'Product', 
    'Tool', 
    'Others',
    'Electronics',
    'Merchandise', 
    'Tools',
    'Components',
    'EROV PRODUCT',
    'JSUMO PRODUCT',
    'ZM ROBO PRODUCT'
));

ALTER TABLE parcel_out ADD CONSTRAINT check_category_out 
CHECK (category IN (
    'Component', 
    'Product', 
    'Tool', 
    'Others',
    'Electronics',
    'Merchandise', 
    'Tools',
    'Components',
    'EROV PRODUCT',
    'JSUMO PRODUCT',
    'ZM ROBO PRODUCT'
));
