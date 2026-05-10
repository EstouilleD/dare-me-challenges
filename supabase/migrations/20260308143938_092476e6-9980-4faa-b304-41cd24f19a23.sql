
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS pinned_post_id uuid REFERENCES public.community_posts(id) ON DELETE SET NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reward_description text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sponsor_cta_text text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sponsor_cta_url text DEFAULT NULL;
