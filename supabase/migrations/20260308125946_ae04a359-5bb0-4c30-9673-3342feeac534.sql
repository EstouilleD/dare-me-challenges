
CREATE TABLE public.challenge_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.challenge_posts ENABLE ROW LEVEL SECURITY;

-- Anyone who can see the challenge can read posts
CREATE POLICY "Users can view posts for visible challenges"
  ON public.challenge_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges
      WHERE challenges.id = challenge_posts.challenge_id
      AND (challenges.is_public = true OR challenges.owner_id = auth.uid() OR user_participates_in_challenge(auth.uid(), challenges.id))
    )
  );

-- Participants and owners can create posts
CREATE POLICY "Participants and owners can create posts"
  ON public.challenge_posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.challenges
      WHERE challenges.id = challenge_posts.challenge_id
      AND (challenges.owner_id = auth.uid() OR user_participates_in_challenge(auth.uid(), challenges.id))
    )
  );

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON public.challenge_posts FOR DELETE
  USING (auth.uid() = user_id);
