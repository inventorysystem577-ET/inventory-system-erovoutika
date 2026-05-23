-- Add description fields for Product In and Product Out records
ALTER TABLE IF EXISTS public.product_in
ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE IF EXISTS public.products_out
ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE IF EXISTS public.parcel_in
ADD COLUMN IF NOT EXISTS description text;
