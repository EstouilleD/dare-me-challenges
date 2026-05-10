
-- Analytics events table for long-term tracking
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_name text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_analytics_events_name_created ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX idx_analytics_events_user_created ON public.analytics_events (user_id, created_at DESC);
CREATE INDEX idx_analytics_events_created ON public.analytics_events (created_at DESC);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read events, anyone authenticated can insert
CREATE POLICY "Admins can view all events"
  ON public.analytics_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- SQL Views for admin dashboard metrics
-- ============================================

-- DAU/WAU/MAU view
CREATE OR REPLACE VIEW public.v_active_users AS
SELECT
  (SELECT count(DISTINCT user_id) FROM public.analytics_events WHERE created_at >= now() - interval '1 day') AS dau,
  (SELECT count(DISTINCT user_id) FROM public.analytics_events WHERE created_at >= now() - interval '7 days') AS wau,
  (SELECT count(DISTINCT user_id) FROM public.analytics_events WHERE created_at >= now() - interval '30 days') AS mau;

-- User growth (daily signups last 30 days)
CREATE OR REPLACE VIEW public.v_user_growth AS
SELECT
  date_trunc('day', created_at)::date AS day,
  count(*) AS signups
FROM public.profiles
WHERE created_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY 1;

-- Challenge metrics
CREATE OR REPLACE VIEW public.v_challenge_metrics AS
SELECT
  (SELECT count(*) FROM public.challenges) AS total_created,
  (SELECT count(*) FROM public.challenges WHERE created_at >= now() - interval '7 days') AS created_7d,
  (SELECT count(*) FROM public.participations) AS total_joins,
  (SELECT count(*) FROM public.participations WHERE created_at >= now() - interval '7 days') AS joins_7d,
  (SELECT count(*) FROM public.proofs) AS total_proofs,
  (SELECT count(*) FROM public.proofs WHERE created_at >= now() - interval '7 days') AS proofs_7d,
  (SELECT count(*) FROM public.votes) AS total_votes,
  (SELECT count(*) FROM public.votes WHERE created_at >= now() - interval '7 days') AS votes_7d,
  (SELECT round(avg(cnt)::numeric, 1) FROM (SELECT count(*) AS cnt FROM public.participations GROUP BY challenge_id) sub) AS avg_participants,
  (SELECT round(
    count(DISTINCT CASE WHEN is_done = true THEN id END)::numeric * 100.0 /
    NULLIF(count(DISTINCT id), 0)::numeric, 1
  ) FROM public.participations) AS completion_rate;

-- Top challenges (by participants last 30 days)
CREATE OR REPLACE VIEW public.v_top_challenges AS
SELECT
  c.id, c.title, c.status,
  count(p.id) AS participant_count,
  (SELECT count(*) FROM public.proofs pr WHERE pr.challenge_id = c.id) AS proof_count
FROM public.challenges c
LEFT JOIN public.participations p ON p.challenge_id = c.id
WHERE c.created_at >= now() - interval '30 days'
GROUP BY c.id, c.title, c.status
ORDER BY participant_count DESC
LIMIT 10;

-- Top communities (by member count)
CREATE OR REPLACE VIEW public.v_top_communities AS
SELECT
  co.id, co.name, co.slug, co.type, co.member_count,
  (SELECT count(*) FROM public.challenges ch WHERE ch.community_id = co.id) AS challenge_count,
  (SELECT count(*) FROM public.community_members cm WHERE cm.community_id = co.id AND cm.joined_at >= now() - interval '7 days') AS new_members_7d
FROM public.communities co
ORDER BY co.member_count DESC
LIMIT 10;

-- Monetization metrics
CREATE OR REPLACE VIEW public.v_monetization AS
SELECT
  (SELECT count(*) FROM public.boosts) AS total_boosts,
  (SELECT count(*) FROM public.boosts WHERE created_at >= now() - interval '7 days') AS boosts_7d,
  (SELECT sum(coin_cost) FROM public.boosts) AS total_boost_coins,
  (SELECT count(*) FROM public.subscriptions WHERE plan = 'premium' AND status = 'active') AS active_premium,
  (SELECT count(*) FROM public.profiles) AS total_users,
  (SELECT count(*) FROM public.certificate_purchases) AS total_certificates,
  (SELECT count(*) FROM public.certificate_purchases WHERE created_at >= now() - interval '7 days') AS certificates_7d;

-- Community metrics
CREATE OR REPLACE VIEW public.v_community_metrics AS
SELECT
  (SELECT count(*) FROM public.communities) AS total_communities,
  (SELECT count(*) FROM public.communities WHERE type = 'brand') AS brand_communities,
  (SELECT count(DISTINCT community_id) FROM public.challenges WHERE community_id IS NOT NULL AND status = 'active') AS active_community_challenges,
  (SELECT count(*) FROM public.community_members WHERE joined_at >= now() - interval '7 days') AS new_members_7d;

-- Retention metrics (day 1, 7, 30)
CREATE OR REPLACE VIEW public.v_retention AS
WITH cohort AS (
  SELECT id AS user_id, created_at::date AS signup_date
  FROM public.profiles
  WHERE created_at >= now() - interval '60 days'
),
activity AS (
  SELECT DISTINCT user_id, created_at::date AS activity_date
  FROM public.analytics_events
)
SELECT
  round(count(DISTINCT CASE WHEN a1.user_id IS NOT NULL THEN c.user_id END)::numeric * 100.0 / NULLIF(count(DISTINCT c.user_id), 0), 1) AS d1_retention,
  round(count(DISTINCT CASE WHEN a7.user_id IS NOT NULL THEN c.user_id END)::numeric * 100.0 / NULLIF(count(DISTINCT c.user_id), 0), 1) AS d7_retention,
  round(count(DISTINCT CASE WHEN a30.user_id IS NOT NULL THEN c.user_id END)::numeric * 100.0 / NULLIF(count(DISTINCT c.user_id), 0), 1) AS d30_retention
FROM cohort c
LEFT JOIN activity a1 ON a1.user_id = c.user_id AND a1.activity_date = c.signup_date + 1
LEFT JOIN activity a7 ON a7.user_id = c.user_id AND a7.activity_date = c.signup_date + 7
LEFT JOIN activity a30 ON a30.user_id = c.user_id AND a30.activity_date = c.signup_date + 30;

-- Engagement trends (daily events last 30 days)
CREATE OR REPLACE VIEW public.v_engagement_trends AS
SELECT
  date_trunc('day', created_at)::date AS day,
  count(*) FILTER (WHERE event_name = 'challenge_created') AS challenges_created,
  count(*) FILTER (WHERE event_name = 'challenge_joined') AS challenges_joined,
  count(*) FILTER (WHERE event_name = 'proof_submitted') AS proofs_submitted,
  count(*) FILTER (WHERE event_name = 'vote_submitted') AS votes_submitted,
  count(*) FILTER (WHERE event_name = 'booster_used') AS boosters_used
FROM public.analytics_events
WHERE created_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY 1;
