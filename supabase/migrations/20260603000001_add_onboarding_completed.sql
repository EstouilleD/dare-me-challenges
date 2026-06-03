-- Add onboarding_completed flag to profiles.
-- The handle_new_user trigger leaves it false (DEFAULT).
-- It is set to true only after the user completes ALL onboarding steps
-- (profile setup → interests → communities → trending challenges).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Backfill: anyone who already completed ProfileSetup (use_avatar IS NOT NULL)
-- is considered to have finished onboarding.
UPDATE public.profiles
SET onboarding_completed = true
WHERE use_avatar IS NOT NULL;
