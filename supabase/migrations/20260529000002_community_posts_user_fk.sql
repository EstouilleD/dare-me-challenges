-- community_posts.user_id was missing a foreign key to profiles.
-- Without it PostgREST cannot join profiles when fetching posts,
-- so the select silently returns null and the feed always appears empty.
ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
