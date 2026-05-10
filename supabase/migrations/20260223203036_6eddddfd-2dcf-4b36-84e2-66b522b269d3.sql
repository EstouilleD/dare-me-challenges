
-- Badges definition table
CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);

-- User badges (earned achievements)
CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all earned badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "System can insert badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seed badges
INSERT INTO public.badges (key, name, description, icon, category, sort_order) VALUES
  ('first_challenge_created', 'Trailblazer', 'Created your first challenge', '🚀', 'creation', 1),
  ('10_challenges_created', 'Challenge Architect', 'Created 10 challenges', '🏗️', 'creation', 2),
  ('50_challenges_created', 'Challenge Factory', 'Created 50 challenges', '🏭', 'creation', 3),
  ('first_challenge_completed', 'Finisher', 'Completed your first challenge', '🏁', 'completion', 10),
  ('10_challenges_completed', 'Unstoppable', 'Completed 10 challenges', '💪', 'completion', 11),
  ('50_challenges_completed', 'Legend', 'Completed 50 challenges', '👑', 'completion', 12),
  ('first_win', 'Champion', 'Won your first challenge', '🏆', 'victory', 20),
  ('5_wins', 'Serial Winner', 'Won 5 challenges', '⭐', 'victory', 21),
  ('10_wins', 'Dominant Force', 'Won 10 challenges', '🔥', 'victory', 22),
  ('honor_master', 'Honor Master', 'Had 10 proofs validated with honors', '🎖️', 'excellence', 30),
  ('first_proof', 'Show & Tell', 'Submitted your first proof', '📸', 'proof', 40),
  ('50_proofs', 'Proof Machine', 'Submitted 50 proofs', '🤖', 'proof', 41),
  ('100_proofs', 'Unstoppable Documenter', 'Submitted 100 proofs', '📚', 'proof', 42),
  ('social_butterfly', 'Social Butterfly', 'Joined 5 different challenges', '🦋', 'social', 50),
  ('crowd_favorite', 'Crowd Favorite', 'Received 25 reactions on your proofs', '❤️', 'social', 51),
  ('commentator', 'Commentator', 'Left 20 comments on proofs', '💬', 'social', 52),
  ('explorer', 'Explorer', 'Joined a public challenge', '🧭', 'social', 53),
  ('first_vote', 'Judge', 'Cast your first vote', '⚖️', 'engagement', 60),
  ('50_votes', 'Supreme Judge', 'Cast 50 votes', '🧑‍⚖️', 'engagement', 61),
  ('early_bird', 'Early Bird', 'Submitted proof on the first day of a challenge', '🐦', 'special', 70),
  ('perfectionist', 'Perfectionist', 'All proofs approved in a challenge', '💎', 'special', 71);

-- Function to check and award badges for a user
CREATE OR REPLACE FUNCTION public.check_and_award_badges(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _badge_key text;
  _count integer;
BEGIN
  -- Challenges created
  SELECT count(*) INTO _count FROM challenges WHERE owner_id = _user_id;
  IF _count >= 1 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = 'first_challenge_created' ON CONFLICT DO NOTHING;
  END IF;
  IF _count >= 10 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = '10_challenges_created' ON CONFLICT DO NOTHING;
  END IF;
  IF _count >= 50 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = '50_challenges_created' ON CONFLICT DO NOTHING;
  END IF;

  -- Challenges completed (is_done = true)
  SELECT count(*) INTO _count FROM participations WHERE user_id = _user_id AND is_done = true;
  IF _count >= 1 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = 'first_challenge_completed' ON CONFLICT DO NOTHING;
  END IF;
  IF _count >= 10 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = '10_challenges_completed' ON CONFLICT DO NOTHING;
  END IF;
  IF _count >= 50 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = '50_challenges_completed' ON CONFLICT DO NOTHING;
  END IF;

  -- Wins (highest score in finished challenges)
  SELECT count(*) INTO _count FROM participations p
    JOIN challenges c ON c.id = p.challenge_id
    WHERE p.user_id = _user_id AND c.status = 'finished'
    AND p.score = (SELECT max(p2.score) FROM participations p2 WHERE p2.challenge_id = c.id)
    AND p.score > 0;
  IF _count >= 1 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = 'first_win' ON CONFLICT DO NOTHING;
  END IF;
  IF _count >= 5 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = '5_wins' ON CONFLICT DO NOTHING;
  END IF;
  IF _count >= 10 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = '10_wins' ON CONFLICT DO NOTHING;
  END IF;

  -- Proofs submitted
  SELECT count(*) INTO _count FROM proofs pr JOIN participations pa ON pa.id = pr.participation_id WHERE pa.user_id = _user_id;
  IF _count >= 1 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = 'first_proof' ON CONFLICT DO NOTHING;
  END IF;
  IF _count >= 50 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = '50_proofs' ON CONFLICT DO NOTHING;
  END IF;
  IF _count >= 100 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = '100_proofs' ON CONFLICT DO NOTHING;
  END IF;

  -- Honor master (10 proofs with all positive votes)
  SELECT count(*) INTO _count FROM proofs pr
    JOIN participations pa ON pa.id = pr.participation_id
    WHERE pa.user_id = _user_id
    AND (SELECT count(*) FROM votes v WHERE v.proof_id = pr.id AND v.vote_type = 'approve') >= 3;
  IF _count >= 10 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = 'honor_master' ON CONFLICT DO NOTHING;
  END IF;

  -- Social butterfly (joined 5 challenges)
  SELECT count(*) INTO _count FROM participations WHERE user_id = _user_id;
  IF _count >= 5 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = 'social_butterfly' ON CONFLICT DO NOTHING;
  END IF;

  -- Crowd favorite (25 reactions)
  SELECT count(*) INTO _count FROM proof_reactions r
    JOIN proofs pr ON pr.id = r.proof_id
    JOIN participations pa ON pa.id = pr.participation_id
    WHERE pa.user_id = _user_id;
  IF _count >= 25 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = 'crowd_favorite' ON CONFLICT DO NOTHING;
  END IF;

  -- Commentator (20 comments)
  SELECT count(*) INTO _count FROM proof_comments WHERE user_id = _user_id;
  IF _count >= 20 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = 'commentator' ON CONFLICT DO NOTHING;
  END IF;

  -- Explorer (joined a public challenge)
  SELECT count(*) INTO _count FROM participations p JOIN challenges c ON c.id = p.challenge_id WHERE p.user_id = _user_id AND c.is_public = true;
  IF _count >= 1 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = 'explorer' ON CONFLICT DO NOTHING;
  END IF;

  -- Votes cast
  SELECT count(*) INTO _count FROM votes WHERE voter_id = _user_id;
  IF _count >= 1 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = 'first_vote' ON CONFLICT DO NOTHING;
  END IF;
  IF _count >= 50 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT _user_id, id FROM badges WHERE key = '50_votes' ON CONFLICT DO NOTHING;
  END IF;

END;
$$;
