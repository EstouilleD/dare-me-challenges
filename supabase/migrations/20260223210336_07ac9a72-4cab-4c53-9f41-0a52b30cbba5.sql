-- Add surprise challenge column
ALTER TABLE public.challenges ADD COLUMN is_surprise boolean NOT NULL DEFAULT false;

-- Comment
COMMENT ON COLUMN public.challenges.is_surprise IS 'When true, participants cannot see other participants proofs until the challenge ends';
