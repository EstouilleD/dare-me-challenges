-- Users with a pending invitation couldn't see a private challenge,
-- so /join/:challengeId returned "Challenge not found" and redirected home.
-- Fix: add a SECURITY DEFINER helper and extend the challenges SELECT policy.

CREATE OR REPLACE FUNCTION public.current_user_invited_to(_challenge_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invitations
    WHERE challenge_id = _challenge_id
      AND recipient_user_id = auth.uid()
      AND status = 'pending'
  );
$$;

DROP POLICY IF EXISTS "Users can view public challenges" ON public.challenges;

CREATE POLICY "Users can view public challenges"
  ON public.challenges
  FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR owner_id = auth.uid()
    OR public.current_user_participates_in(id)
    OR public.current_user_invited_to(id)
  );
