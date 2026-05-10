
CREATE OR REPLACE FUNCTION public.get_community_leaderboard(_community_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  profile_photo_url text,
  use_avatar boolean,
  total_points integer,
  challenges_completed integer,
  challenges_won integer,
  proofs_submitted integer,
  honor_votes integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH community_participations AS (
    SELECT p.id AS participation_id, p.user_id, p.is_done, p.challenge_id
    FROM participations p
    JOIN challenges c ON c.id = p.challenge_id
    WHERE c.community_id = _community_id AND p.is_active = true
  ),
  user_proofs AS (
    SELECT cp.user_id, count(pr.id)::integer AS proof_count
    FROM community_participations cp
    LEFT JOIN proofs pr ON pr.participation_id = cp.participation_id
    GROUP BY cp.user_id
  ),
  user_completions AS (
    SELECT user_id, count(*)::integer AS completed
    FROM community_participations
    WHERE is_done = true
    GROUP BY user_id
  ),
  user_wins AS (
    SELECT cp.user_id, count(*)::integer AS wins
    FROM community_participations cp
    JOIN challenges c ON c.id = cp.challenge_id
    WHERE c.status = 'finished'
    AND cp.is_done = true
    AND (
      SELECT count(*) FROM participations p2
      JOIN votes v ON v.proof_id IN (SELECT pr2.id FROM proofs pr2 WHERE pr2.participation_id = p2.id)
      WHERE p2.challenge_id = cp.challenge_id AND p2.user_id != cp.user_id
      AND v.vote_type = 'honor'
    ) <= (
      SELECT count(*) FROM participations p3
      JOIN votes v2 ON v2.proof_id IN (SELECT pr3.id FROM proofs pr3 WHERE pr3.participation_id = p3.id)
      WHERE p3.challenge_id = cp.challenge_id AND p3.user_id = cp.user_id
      AND v2.vote_type = 'honor'
    )
    GROUP BY cp.user_id
  ),
  user_honors AS (
    SELECT cp.user_id, count(v.id)::integer AS honor_count
    FROM community_participations cp
    JOIN proofs pr ON pr.participation_id = cp.participation_id
    JOIN votes v ON v.proof_id = pr.id AND v.vote_type = 'honor'
    GROUP BY cp.user_id
  ),
  all_users AS (
    SELECT DISTINCT user_id FROM community_participations
  )
  SELECT
    au.user_id,
    prof.display_name,
    prof.avatar_url,
    prof.profile_photo_url,
    COALESCE(prof.use_avatar, false) AS use_avatar,
    (
      COALESCE(uc.completed, 0) * 10 +
      COALESCE(uw.wins, 0) * 25 +
      COALESCE(up.proof_count, 0) * 2 +
      COALESCE(uh.honor_count, 0) * 5
    )::integer AS total_points,
    COALESCE(uc.completed, 0)::integer AS challenges_completed,
    COALESCE(uw.wins, 0)::integer AS challenges_won,
    COALESCE(up.proof_count, 0)::integer AS proofs_submitted,
    COALESCE(uh.honor_count, 0)::integer AS honor_votes
  FROM all_users au
  JOIN profiles prof ON prof.id = au.user_id
  LEFT JOIN user_proofs up ON up.user_id = au.user_id
  LEFT JOIN user_completions uc ON uc.user_id = au.user_id
  LEFT JOIN user_wins uw ON uw.user_id = au.user_id
  LEFT JOIN user_honors uh ON uh.user_id = au.user_id
  ORDER BY total_points DESC, honor_votes DESC, challenges_won DESC
$$;
