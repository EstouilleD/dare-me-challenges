-- Admins can read and delete beta feedback submissions.
DROP POLICY IF EXISTS "Admins can view all beta feedback" ON public.beta_feedback;
CREATE POLICY "Admins can view all beta feedback"
  ON public.beta_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete beta feedback" ON public.beta_feedback;
CREATE POLICY "Admins can delete beta feedback"
  ON public.beta_feedback FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
