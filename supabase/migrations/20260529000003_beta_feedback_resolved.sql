-- Add resolved flag to beta_feedback so admins can tick off actioned items.
ALTER TABLE public.beta_feedback
  ADD COLUMN IF NOT EXISTS resolved boolean NOT NULL DEFAULT false;

-- Allow admins to update (toggle resolved flag).
DROP POLICY IF EXISTS "Admins can update beta feedback" ON public.beta_feedback;
CREATE POLICY "Admins can update beta feedback"
  ON public.beta_feedback FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
