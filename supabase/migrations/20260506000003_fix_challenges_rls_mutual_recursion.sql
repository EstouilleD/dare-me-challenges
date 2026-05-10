-- Fix mutual recursion between challenges and participations RLS policies.
--
-- The previous migration (000002) fixed the self-recursion inside the
-- participations SELECT policy by introducing current_user_participates_in()
-- (SECURITY DEFINER).  However, a second loop remained:
--
--   participations policy  →  queries challenges
--   challenges policy      →  queries participations  (raw subquery, triggers RLS)
--   participations policy  →  queries challenges  ...  (infinite)
--
-- The proofs SELECT policy has the same problem via its inner EXISTS on
-- participations inside a challenges subquery.
--
-- Fix: replace every raw "EXISTS (SELECT 1 FROM public.participations ...)"
-- that appears inside an RLS policy with a call to the already-existing
-- current_user_participates_in() SECURITY DEFINER function.
-- SECURITY DEFINER bypasses RLS, so it never re-enters any policy.

-- ── challenges SELECT policy ──────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view public challenges" ON public.challenges;

CREATE POLICY "Users can view public challenges"
  ON public.challenges
  FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR owner_id = auth.uid()
    OR public.current_user_participates_in(id)
  );

-- ── proofs SELECT policy ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view proofs for challenges they participate in" ON public.proofs;

CREATE POLICY "Users can view proofs for challenges they participate in"
  ON public.proofs
  FOR SELECT
  TO authenticated
  USING (
    -- own proof (via direct participation lookup — safe, no cross-policy chain)
    EXISTS (
      SELECT 1 FROM public.participations
      WHERE id = participation_id
        AND user_id = auth.uid()
    )
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
