
CREATE TABLE public.certificate_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE public.certificate_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificate purchases"
  ON public.certificate_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert certificate purchases"
  ON public.certificate_purchases FOR INSERT
  TO authenticated
  WITH CHECK (true);
