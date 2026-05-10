-- Admins were missing a SELECT policy on challenges.
-- UPDATE and DELETE admin policies exist (from 20260223192844) but SELECT was never added.
-- Without this, admins can only see public challenges or ones they own/participate in.

DROP POLICY IF EXISTS "Admins can view all challenges" ON public.challenges;

CREATE POLICY "Admins can view all challenges"
  ON public.challenges
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
