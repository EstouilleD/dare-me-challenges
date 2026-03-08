
-- Categories table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT '📂',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);

-- Seed categories
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Sports', 'sports', '🏃', 1),
  ('Cooking', 'cooking', '🍳', 2),
  ('Wellness', 'wellness', '🧘', 3),
  ('Productivity', 'productivity', '📈', 4),
  ('Family', 'family', '👨‍👩‍👧‍👦', 5),
  ('Creative', 'creative', '🎨', 6),
  ('Learning', 'learning', '📚', 7),
  ('Social', 'social', '🤝', 8),
  ('Fitness', 'fitness', '💪', 9),
  ('Music', 'music', '🎵', 10),
  ('Gaming', 'gaming', '🎮', 11),
  ('Other', 'other', '✨', 99);

-- Add category_id to challenges
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) DEFAULT NULL;

-- Challenge shares tracking
CREATE TABLE public.challenge_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'link',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.challenge_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own shares" ON public.challenge_shares FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own shares" ON public.challenge_shares FOR SELECT USING (auth.uid() = user_id);

-- Community invite links
CREATE TABLE public.community_invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  code text NOT NULL UNIQUE DEFAULT substring(gen_random_uuid()::text from 1 for 8),
  uses integer NOT NULL DEFAULT 0,
  max_uses integer DEFAULT NULL,
  expires_at timestamptz DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_invite_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Community admins can manage invite links" ON public.community_invite_links FOR ALL USING (is_community_admin(auth.uid(), community_id));
CREATE POLICY "Anyone can view active invite links" ON public.community_invite_links FOR SELECT USING (is_active = true);

-- User referrals tracking
CREATE TABLE public.user_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  reward_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON public.user_referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "System can insert referrals" ON public.user_referrals FOR INSERT WITH CHECK (true);

-- User interests (for onboarding)
CREATE TABLE public.user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id)
);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own interests" ON public.user_interests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own interests" ON public.user_interests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trending challenges function
CREATE OR REPLACE FUNCTION public.get_trending_challenges(_limit integer DEFAULT 10)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  status text,
  start_date timestamptz,
  end_date timestamptz,
  is_public boolean,
  type_icon text,
  type_name text,
  category_name text,
  category_icon text,
  owner_name text,
  owner_avatar_url text,
  owner_photo_url text,
  owner_use_avatar boolean,
  community_name text,
  community_slug text,
  participant_count bigint,
  trending_score numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  WITH challenge_stats AS (
    SELECT
      c.id,
      c.title,
      c.description,
      c.status,
      c.start_date,
      c.end_date,
      c.is_public,
      ct.icon AS type_icon,
      ct.name AS type_name,
      cat.name AS category_name,
      cat.icon AS category_icon,
      p.display_name AS owner_name,
      p.avatar_url AS owner_avatar_url,
      p.profile_photo_url AS owner_photo_url,
      COALESCE(p.use_avatar, false) AS owner_use_avatar,
      com.name AS community_name,
      com.slug AS community_slug,
      (SELECT count(*) FROM participations pa WHERE pa.challenge_id = c.id) AS participant_count,
      (SELECT count(*) FROM participations pa WHERE pa.challenge_id = c.id AND pa.created_at > now() - interval '7 days') AS joins_7d,
      (SELECT count(*) FROM proofs pr WHERE pr.challenge_id = c.id AND pr.created_at > now() - interval '7 days') AS proofs_7d,
      (SELECT count(*) FROM votes v JOIN proofs pr2 ON pr2.id = v.proof_id WHERE pr2.challenge_id = c.id AND v.created_at > now() - interval '7 days') AS votes_7d,
      EXTRACT(EPOCH FROM (now() - c.created_at)) / 3600.0 AS age_hours
    FROM challenges c
    JOIN challenge_types ct ON ct.id = c.type_id
    JOIN profiles p ON p.id = c.owner_id
    LEFT JOIN categories cat ON cat.id = c.category_id
    LEFT JOIN communities com ON com.id = c.community_id
    WHERE c.is_public = true AND c.status IN ('active', 'upcoming')
  )
  SELECT
    cs.id, cs.title, cs.description, cs.status, cs.start_date, cs.end_date, cs.is_public,
    cs.type_icon, cs.type_name, cs.category_name, cs.category_icon,
    cs.owner_name, cs.owner_avatar_url, cs.owner_photo_url, cs.owner_use_avatar,
    cs.community_name, cs.community_slug,
    cs.participant_count,
    (cs.joins_7d * 3 + cs.proofs_7d * 2 + cs.votes_7d * 1)::numeric / GREATEST(POWER(cs.age_hours / 24.0, 1.5), 1) AS trending_score
  FROM challenge_stats cs
  ORDER BY trending_score DESC
  LIMIT _limit;
$$;

-- Trending communities function
CREATE OR REPLACE FUNCTION public.get_trending_communities(_limit integer DEFAULT 10)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  description text,
  type community_type,
  category text,
  logo_url text,
  is_verified boolean,
  member_count integer,
  trending_score numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  WITH community_stats AS (
    SELECT
      c.id, c.name, c.slug, c.description, c.type, c.category, c.logo_url, c.is_verified, c.member_count,
      (SELECT count(*) FROM community_members cm WHERE cm.community_id = c.id AND cm.joined_at > now() - interval '7 days') AS new_members_7d,
      (SELECT count(*) FROM community_posts cp WHERE cp.community_id = c.id AND cp.created_at > now() - interval '7 days') AS posts_7d,
      (SELECT count(*) FROM challenges ch WHERE ch.community_id = c.id AND ch.created_at > now() - interval '7 days') AS challenges_7d,
      EXTRACT(EPOCH FROM (now() - c.created_at)) / 86400.0 AS age_days
    FROM communities c
    WHERE c.type IN ('public', 'brand')
  )
  SELECT
    cs.id, cs.name, cs.slug, cs.description, cs.type, cs.category, cs.logo_url, cs.is_verified, cs.member_count,
    (cs.new_members_7d * 3 + cs.posts_7d * 1 + cs.challenges_7d * 5)::numeric / GREATEST(POWER(cs.age_days, 1.2), 1) AS trending_score
  FROM community_stats cs
  ORDER BY trending_score DESC
  LIMIT _limit;
$$;

-- Recommended challenges function
CREATE OR REPLACE FUNCTION public.get_recommended_challenges(_user_id uuid, _limit integer DEFAULT 10)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  status text,
  end_date timestamptz,
  type_icon text,
  type_name text,
  category_name text,
  category_icon text,
  owner_name text,
  owner_avatar_url text,
  owner_photo_url text,
  owner_use_avatar boolean,
  participant_count bigint,
  relevance_score numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  WITH user_type_prefs AS (
    SELECT c.type_id, count(*)::numeric AS pref_score
    FROM participations p JOIN challenges c ON c.id = p.challenge_id
    WHERE p.user_id = _user_id
    GROUP BY c.type_id
  ),
  user_category_prefs AS (
    SELECT ui.category_id, 2::numeric AS pref_score
    FROM user_interests ui WHERE ui.user_id = _user_id
  ),
  user_community_ids AS (
    SELECT community_id FROM community_members WHERE user_id = _user_id
  ),
  already_joined AS (
    SELECT challenge_id FROM participations WHERE user_id = _user_id
  )
  SELECT
    c.id, c.title, c.description, c.status, c.end_date,
    ct.icon AS type_icon, ct.name AS type_name,
    cat.name AS category_name, cat.icon AS category_icon,
    pr.display_name AS owner_name, pr.avatar_url AS owner_avatar_url,
    pr.profile_photo_url AS owner_photo_url, COALESCE(pr.use_avatar, false) AS owner_use_avatar,
    (SELECT count(*) FROM participations pa WHERE pa.challenge_id = c.id) AS participant_count,
    (
      COALESCE((SELECT pref_score FROM user_type_prefs WHERE type_id = c.type_id), 0) +
      COALESCE((SELECT pref_score FROM user_category_prefs WHERE category_id = c.category_id), 0) +
      CASE WHEN c.community_id IN (SELECT community_id FROM user_community_ids) THEN 3 ELSE 0 END
    ) AS relevance_score
  FROM challenges c
  JOIN challenge_types ct ON ct.id = c.type_id
  JOIN profiles pr ON pr.id = c.owner_id
  LEFT JOIN categories cat ON cat.id = c.category_id
  WHERE c.is_public = true
    AND c.status IN ('active', 'upcoming')
    AND c.owner_id != _user_id
    AND c.id NOT IN (SELECT challenge_id FROM already_joined)
  ORDER BY relevance_score DESC, c.created_at DESC
  LIMIT _limit;
$$;
