-- Admins need SELECT on proofs and participations for the moderation dashboard.

DROP POLICY IF EXISTS "Admins can view all proofs" ON public.proofs;
CREATE POLICY "Admins can view all proofs"
  ON public.proofs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete any proof" ON public.proofs;
CREATE POLICY "Admins can delete any proof"
  ON public.proofs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all participations" ON public.participations;
CREATE POLICY "Admins can view all participations"
  ON public.participations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
