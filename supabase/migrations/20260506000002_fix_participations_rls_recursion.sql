-- Fix infinite recursion in participations RLS policy.
--
-- The original SELECT policy checked whether the current user was already a
-- participant by querying public.participations *inside* its own USING clause.
-- PostgreSQL re-evaluates RLS policies for every row access, so that inner
-- SELECT triggers the same policy again → infinite recursion.
--
-- Fix: extract the self-referential subquery into a SECURITY DEFINER function.
-- SECURITY DEFINER runs as the function owner (bypasses RLS), so it never
-- re-enters the policy that called it.

CREATE OR REPLACE FUNCTION public.current_user_participates_in(p_challenge_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.participations
    WHERE challenge_id = p_challenge_id
      AND user_id = auth.uid()
  );
$$;

-- Drop the recursive policy and recreate it using the helper function.
DROP POLICY IF EXISTS "Users can view participations for visible challenges" ON public.participations;

CREATE POLICY "Users can view participations for visible challenges"
  ON public.participations
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.challenges
      WHERE id = challenge_id
        AND (
          is_public = true
          OR owner_id = auth.uid()
          OR public.current_user_participates_in(challenges.id)
        )
    )
  );
