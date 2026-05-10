-- Add missing frequency/quantity columns to challenges table
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS frequency_quantity integer DEFAULT NULL;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS frequency_period text DEFAULT NULL;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS quantity_target integer DEFAULT NULL;
