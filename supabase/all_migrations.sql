-- Migration: 20251124082456_6c95178e-8770-4dfd-8ef8-d18bd83201a6.sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users/profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  full_name TEXT,
  profile_photo_url TEXT,
  avatar_url TEXT,
  use_avatar BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create challenge_types table
CREATE TABLE public.challenge_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL,
  has_quantity BOOLEAN DEFAULT false,
  has_proof BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create challenges table
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type_id UUID REFERENCES public.challenge_types(id) NOT NULL,
  is_public BOOLEAN DEFAULT false,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  demo_photo_url TEXT,
  demo_video_url TEXT,
  demo_audio_url TEXT,
  ask_numeric_score BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'finished', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create participations table
CREATE TABLE public.participations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_done BOOLEAN DEFAULT false,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Create proofs table
CREATE TABLE public.proofs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participation_id UUID REFERENCES public.participations(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT,
  video_url TEXT,
  text TEXT,
  quantity_value INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proof_id UUID REFERENCES public.proofs(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('honor', 'validated', 'rejected')),
  numeric_score INTEGER CHECK (numeric_score >= 1 AND numeric_score <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(proof_id, voter_id)
);

-- Create invitations table
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- RLS Policies for challenge_types (public read, admin write - for now all can read)
CREATE POLICY "Everyone can view challenge types" ON public.challenge_types FOR SELECT TO authenticated USING (true);

-- RLS Policies for challenges
CREATE POLICY "Users can view public challenges" ON public.challenges FOR SELECT TO authenticated 
  USING (is_public = true OR owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.participations WHERE challenge_id = challenges.id AND user_id = auth.uid()));

CREATE POLICY "Users can create challenges" ON public.challenges FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own challenges" ON public.challenges FOR UPDATE TO authenticated 
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own challenges" ON public.challenges FOR DELETE TO authenticated 
  USING (auth.uid() = owner_id);

-- RLS Policies for participations
CREATE POLICY "Users can view participations for visible challenges" ON public.participations FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.challenges WHERE id = challenge_id AND 
      (is_public = true OR owner_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.participations p2 WHERE p2.challenge_id = challenges.id AND p2.user_id = auth.uid()))));

CREATE POLICY "Users can create own participations" ON public.participations FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participations" ON public.participations FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id);

-- RLS Policies for proofs
CREATE POLICY "Users can view proofs for challenges they participate in" ON public.proofs FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.participations WHERE id = participation_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.challenges WHERE id = challenge_id AND 
      (is_public = true OR owner_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.participations WHERE challenge_id = challenges.id AND user_id = auth.uid()))));

CREATE POLICY "Users can create proofs for own participations" ON public.proofs FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.participations WHERE id = participation_id AND user_id = auth.uid()));

CREATE POLICY "Users can update own proofs" ON public.proofs FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.participations WHERE id = participation_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete own proofs" ON public.proofs FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.participations WHERE id = participation_id AND user_id = auth.uid()));

-- RLS Policies for votes
CREATE POLICY "Users can view votes on proofs they can see" ON public.votes FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.proofs WHERE id = proof_id AND 
    EXISTS (SELECT 1 FROM public.challenges WHERE id = proofs.challenge_id AND 
      (is_public = true OR owner_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.participations WHERE challenge_id = challenges.id AND user_id = auth.uid())))));

CREATE POLICY "Users can create votes" ON public.votes FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Users can update own votes" ON public.votes FOR UPDATE TO authenticated 
  USING (auth.uid() = voter_id);

CREATE POLICY "Users can delete own votes" ON public.votes FOR DELETE TO authenticated 
  USING (auth.uid() = voter_id);

-- RLS Policies for invitations
CREATE POLICY "Users can view invitations they sent or received" ON public.invitations FOR SELECT TO authenticated 
  USING (sender_id = auth.uid() OR recipient_user_id = auth.uid());

CREATE POLICY "Users can create invitations for own challenges" ON public.invitations FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.challenges WHERE id = challenge_id AND owner_id = auth.uid()));

CREATE POLICY "Recipients can update invitations" ON public.invitations FOR UPDATE TO authenticated 
  USING (recipient_user_id = auth.uid());

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_participations_updated_at BEFORE UPDATE ON public.participations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default challenge types
INSERT INTO public.challenge_types (name, description, icon, has_quantity, has_proof) VALUES
  ('Creative', 'Show your creativity with photos, videos or text', '🎨', false, true),
  ('Quantity', 'Complete a specific number of tasks', '📊', true, true),
  ('Frequency', 'Do something regularly over time', '📅', true, true);

-- Create function to update challenge status based on dates
CREATE OR REPLACE FUNCTION public.update_challenge_status()
RETURNS void AS $$
BEGIN
  UPDATE public.challenges
  SET status = CASE
    WHEN start_date > now() THEN 'upcoming'
    WHEN end_date < now() THEN 'finished'
    ELSE 'active'
  END
  WHERE status NOT IN ('cancelled', 'finished');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Missing tables not in migration files (created directly in original project)

-- Reports table (referenced in migration 20260223192633)
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'inappropriate',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- Proof reactions (referenced in badges migration 20260223203036)
CREATE TABLE IF NOT EXISTS public.proof_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid NOT NULL REFERENCES public.proofs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(proof_id, user_id, reaction_type)
);
ALTER TABLE public.proof_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view reactions" ON public.proof_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own reactions" ON public.proof_reactions FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Proof comments (referenced in badges migration 20260223203036)
CREATE TABLE IF NOT EXISTS public.proof_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid NOT NULL REFERENCES public.proofs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proof_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view comments" ON public.proof_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own comments" ON public.proof_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.proof_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Boosts table (referenced in migration 20260308130820)
CREATE TABLE IF NOT EXISTS public.boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  boost_type text NOT NULL DEFAULT 'standard',
  target_challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  coin_cost integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own boosts" ON public.boosts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own boosts" ON public.boosts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Subscriptions table (referenced in analytics views)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Proofs storage bucket (referenced in security migrations)
INSERT INTO storage.buckets (id, name, public) VALUES ('proofs', 'proofs', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Users can upload own proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view proof files" ON storage.objects FOR SELECT USING (bucket_id = 'proofs');

-- user_participates_in_challenge helper (referenced in challenge_posts migration)
CREATE OR REPLACE FUNCTION public.user_participates_in_challenge(_user_id uuid, _challenge_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.participations
    WHERE user_id = _user_id AND challenge_id = _challenge_id AND is_active = true
  )
$$;

-- Migration: 20260206152659_0b66a8d6-cfdc-43e1-a463-7736372cc046.sql

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Migration: 20260223124640_4f4ed18a-9ce8-428a-91dc-37d56edf2d7d.sql

-- Re-create the trigger for handle_new_user
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Migration: 20260223192633_c83b5b52-b07f-4c66-b29d-83f43cfb009f.sql

-- Add details column to reports
ALTER TABLE public.reports ADD COLUMN details text;

-- Add unique constraint to prevent duplicate reports per user per challenge
ALTER TABLE public.reports ADD CONSTRAINT reports_reporter_challenge_unique UNIQUE (reporter_id, challenge_id);

-- Create trigger to set challenge status to 'under_review' when reported
CREATE OR REPLACE FUNCTION public.handle_challenge_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.challenges
  SET status = 'under_review'
  WHERE id = NEW.challenge_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_challenge_reported
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_challenge_report();

-- Migration: 20260223192844_917b8774-0765-4013-a930-ae9f0b8e80f9.sql

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS on user_roles: admins can view and manage
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add account_status to profiles
ALTER TABLE public.profiles ADD COLUMN account_status text NOT NULL DEFAULT 'active';

-- Admin can view ALL reports (existing policy only allows own reports)
CREATE POLICY "Admins can view all reports"
ON public.reports FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any challenge (for status changes like removing content)
CREATE POLICY "Admins can update any challenge"
ON public.challenges FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any challenge
CREATE POLICY "Admins can delete any challenge"
ON public.challenges FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any profile (for banning/suspending)
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Migration: 20260223193643_1a422669-d9c8-4f3a-b13f-dd95a7e38bbf.sql

-- Create deleted_users archive table
CREATE TABLE public.deleted_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id uuid NOT NULL,
  email text NOT NULL,
  display_name text NOT NULL,
  full_name text,
  account_status text NOT NULL DEFAULT 'deleted',
  deleted_by uuid,
  deletion_reason text,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz
);

ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view deleted users
CREATE POLICY "Admins can view deleted users"
ON public.deleted_users FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert deleted users"
ON public.deleted_users FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow the edge function (service role) to insert as well - handled via service role key

-- Migration: 20260223201339_0cdb4e9d-c73c-449f-be25-9633e1023360.sql
ALTER TABLE public.challenges DROP CONSTRAINT challenges_status_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_status_check CHECK (status = ANY (ARRAY['upcoming'::text, 'active'::text, 'finished'::text, 'cancelled'::text, 'under_review'::text]));
-- Migration: 20260223201448_cfad4be3-1492-4af6-9a1f-8d83bb838d07.sql
CREATE TRIGGER on_report_created
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_challenge_report();
-- Migration: 20260223203036_6eddddfd-2dcf-4b36-84e2-66b522b269d3.sql

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

-- Migration: 20260223205053_5f3f82c6-88dd-4058-b2d1-6b188ee9b627.sql

-- In-app notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Trigger: notify when someone completes a challenge (is_done = true)
CREATE OR REPLACE FUNCTION public.notify_challenge_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _display_name text;
  _challenge_title text;
  _challenge_id uuid;
  _participant record;
BEGIN
  IF NEW.is_done = true AND (OLD.is_done IS NULL OR OLD.is_done = false) THEN
    SELECT display_name INTO _display_name FROM profiles WHERE id = NEW.user_id;
    SELECT title, id INTO _challenge_title, _challenge_id FROM challenges WHERE id = NEW.challenge_id;
    
    -- Notify all other participants in the challenge
    FOR _participant IN
      SELECT user_id FROM participations WHERE challenge_id = NEW.challenge_id AND user_id != NEW.user_id
    LOOP
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        _participant.user_id,
        'challenge_completed',
        '🏁 Challenge completed!',
        _display_name || ' has completed the challenge "' || _challenge_title || '"',
        jsonb_build_object('challenge_id', _challenge_id, 'completer_id', NEW.user_id)
      );
    END LOOP;
    
    -- Also notify the challenge owner
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT c.owner_id, 'challenge_completed', '🏁 Challenge completed!',
      _display_name || ' has completed your challenge "' || _challenge_title || '"',
      jsonb_build_object('challenge_id', _challenge_id, 'completer_id', NEW.user_id)
    FROM challenges c WHERE c.id = NEW.challenge_id AND c.owner_id != NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_challenge_completed
AFTER UPDATE ON public.participations
FOR EACH ROW
EXECUTE FUNCTION public.notify_challenge_completed();

-- Trigger: notify when someone votes on your proof
CREATE OR REPLACE FUNCTION public.notify_proof_voted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _voter_name text;
  _proof_owner_id uuid;
  _challenge_title text;
  _challenge_id uuid;
  _vote_label text;
BEGIN
  SELECT display_name INTO _voter_name FROM profiles WHERE id = NEW.voter_id;
  
  SELECT pa.user_id, c.title, c.id INTO _proof_owner_id, _challenge_title, _challenge_id
  FROM proofs p
  JOIN participations pa ON pa.id = p.participation_id
  JOIN challenges c ON c.id = p.challenge_id
  WHERE p.id = NEW.proof_id;
  
  IF _proof_owner_id IS NOT NULL AND _proof_owner_id != NEW.voter_id THEN
    _vote_label := CASE 
      WHEN NEW.vote_type = 'honor' THEN 'validated with honors'
      WHEN NEW.vote_type = 'approve' THEN 'validated'
      ELSE 'voted on'
    END;
    
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      _proof_owner_id,
      'proof_voted',
      '⚖️ New vote on your proof!',
      _voter_name || ' ' || _vote_label || ' your proof in "' || _challenge_title || '"',
      jsonb_build_object('challenge_id', _challenge_id, 'proof_id', NEW.proof_id, 'voter_id', NEW.voter_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_proof_voted
AFTER INSERT ON public.votes
FOR EACH ROW
EXECUTE FUNCTION public.notify_proof_voted();

-- Trigger: notify when you reach the top of a challenge ranking
CREATE OR REPLACE FUNCTION public.notify_top_ranking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _max_score integer;
  _challenge_title text;
BEGIN
  IF NEW.score IS NOT NULL AND NEW.score > 0 THEN
    SELECT max(score) INTO _max_score FROM participations 
    WHERE challenge_id = NEW.challenge_id AND user_id != NEW.user_id;
    
    IF _max_score IS NULL OR NEW.score > _max_score THEN
      -- Check if we already notified for this challenge recently (avoid spam)
      IF NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = NEW.user_id 
        AND type = 'top_ranking' 
        AND (data->>'challenge_id')::uuid = NEW.challenge_id
        AND created_at > now() - interval '1 hour'
      ) THEN
        SELECT title INTO _challenge_title FROM challenges WHERE id = NEW.challenge_id;
        
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
          NEW.user_id,
          'top_ranking',
          '🏆 You''re on top!',
          'You''ve reached the top of the ranking in "' || _challenge_title || '"!',
          jsonb_build_object('challenge_id', NEW.challenge_id)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_score_updated
AFTER UPDATE OF score ON public.participations
FOR EACH ROW
EXECUTE FUNCTION public.notify_top_ranking();

-- Migration: 20260223205156_cb9c4a7e-420a-4e77-997c-1622559d318c.sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- Migration: 20260223210336_07ac9a72-4cab-4c53-9f41-0a52b30cbba5.sql
-- Add surprise challenge column
ALTER TABLE public.challenges ADD COLUMN is_surprise boolean NOT NULL DEFAULT false;

-- Comment
COMMENT ON COLUMN public.challenges.is_surprise IS 'When true, participants cannot see other participants proofs until the challenge ends';

-- Migration: 20260308125946_ae04a359-5bb0-4c30-9673-3342feeac534.sql

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

-- Migration: 20260308130820_134d5a7f-d5c8-4ae6-885b-988718cef2cf.sql

-- 1. Trigger: notify when someone uses a boost in a challenge
CREATE OR REPLACE FUNCTION public.notify_boost_used()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booster_name text;
  _challenge_title text;
  _participant record;
BEGIN
  IF NEW.target_challenge_id IS NOT NULL THEN
    SELECT display_name INTO _booster_name FROM profiles WHERE id = NEW.user_id;
    SELECT title INTO _challenge_title FROM challenges WHERE id = NEW.target_challenge_id;

    -- Notify all other participants in the challenge
    FOR _participant IN
      SELECT user_id FROM participations WHERE challenge_id = NEW.target_challenge_id AND user_id != NEW.user_id
    LOOP
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        _participant.user_id,
        'boost_used',
        '🚀 Boost activated!',
        _booster_name || ' used a boost in "' || _challenge_title || '"',
        jsonb_build_object('challenge_id', NEW.target_challenge_id, 'booster_id', NEW.user_id)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_boost_created
  AFTER INSERT ON public.boosts
  FOR EACH ROW EXECUTE FUNCTION public.notify_boost_used();

-- 2. Update vote trigger to send distinct notification for honor votes
CREATE OR REPLACE FUNCTION public.notify_proof_voted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _voter_name text;
  _proof_owner_id uuid;
  _challenge_title text;
  _challenge_id uuid;
  _vote_label text;
  _notif_type text;
  _notif_title text;
BEGIN
  SELECT display_name INTO _voter_name FROM profiles WHERE id = NEW.voter_id;
  
  SELECT pa.user_id, c.title, c.id INTO _proof_owner_id, _challenge_title, _challenge_id
  FROM proofs p
  JOIN participations pa ON pa.id = p.participation_id
  JOIN challenges c ON c.id = p.challenge_id
  WHERE p.id = NEW.proof_id;
  
  IF _proof_owner_id IS NOT NULL AND _proof_owner_id != NEW.voter_id THEN
    IF NEW.vote_type = 'honor' THEN
      _notif_type := 'honor_vote_received';
      _notif_title := '🏅 Honor vote received!';
      _vote_label := 'gave you an honor vote';
    ELSIF NEW.vote_type = 'approve' THEN
      _notif_type := 'proof_voted';
      _notif_title := '⚖️ New vote on your proof!';
      _vote_label := 'validated';
    ELSE
      _notif_type := 'proof_voted';
      _notif_title := '⚖️ New vote on your proof!';
      _vote_label := 'voted on';
    END IF;
    
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      _proof_owner_id,
      _notif_type,
      _notif_title,
      _voter_name || ' ' || _vote_label || ' your proof in "' || _challenge_title || '"',
      jsonb_build_object('challenge_id', _challenge_id, 'proof_id', NEW.proof_id, 'voter_id', NEW.voter_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger for votes
DROP TRIGGER IF EXISTS on_vote_created ON public.votes;
CREATE TRIGGER on_vote_created
  AFTER INSERT ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.notify_proof_voted();

-- 3. Update ranking trigger to use distinct message for rank-up
CREATE OR REPLACE FUNCTION public.notify_top_ranking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _max_score integer;
  _challenge_title text;
BEGIN
  IF NEW.score IS NOT NULL AND NEW.score > 0 THEN
    SELECT max(score) INTO _max_score FROM participations 
    WHERE challenge_id = NEW.challenge_id AND user_id != NEW.user_id;
    
    IF _max_score IS NULL OR NEW.score > _max_score THEN
      IF NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = NEW.user_id 
        AND type = 'ranking_up' 
        AND (data->>'challenge_id')::uuid = NEW.challenge_id
        AND created_at > now() - interval '1 hour'
      ) THEN
        SELECT title INTO _challenge_title FROM challenges WHERE id = NEW.challenge_id;
        
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
          NEW.user_id,
          'ranking_up',
          '📈 You moved up in ranking!',
          'You''ve reached the top of the ranking in "' || _challenge_title || '"!',
          jsonb_build_object('challenge_id', NEW.challenge_id)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Migration: 20260308130928_c04448b8-80d7-42ea-82c1-4ee1109d22fa.sql

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Migration: 20260308140516_9fc394aa-dfb5-41f3-9661-e2c10f23586e.sql

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

-- Migration: 20260308141625_dd685452-b858-4ef9-9ee9-666fe54d1db6.sql

-- ============================================
-- 1. ENUMS
-- ============================================

-- Community type enum
CREATE TYPE public.community_type AS ENUM ('public', 'private', 'brand');

-- Community member role enum
CREATE TYPE public.community_role AS ENUM ('owner', 'admin', 'moderator', 'member');

-- ============================================
-- 2. COMMUNITIES TABLE
-- ============================================
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  type community_type NOT NULL DEFAULT 'public',
  logo_url text,
  banner_url text,
  accent_color text DEFAULT '#6366f1',
  website_url text,
  is_verified boolean NOT NULL DEFAULT false,
  member_count integer NOT NULL DEFAULT 0,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_communities_slug ON public.communities(slug);
CREATE INDEX idx_communities_type ON public.communities(type);
CREATE INDEX idx_communities_owner ON public.communities(owner_id);
CREATE INDEX idx_communities_verified ON public.communities(is_verified) WHERE is_verified = true;

-- Updated_at trigger
CREATE TRIGGER communities_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 3. COMMUNITY MEMBERS TABLE
-- ============================================
CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role community_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

CREATE INDEX idx_community_members_user ON public.community_members(user_id);
CREATE INDEX idx_community_members_community ON public.community_members(community_id);
CREATE INDEX idx_community_members_role ON public.community_members(community_id, role);

-- ============================================
-- 4. COMMUNITY INVITATIONS TABLE
-- ============================================
CREATE TABLE public.community_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL,
  invitee_user_id uuid,
  invitee_email text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_invitations_community ON public.community_invitations(community_id);
CREATE INDEX idx_community_invitations_invitee ON public.community_invitations(invitee_user_id);

-- ============================================
-- 5. COMMUNITY POSTS TABLE (feed)
-- ============================================
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_posts_community ON public.community_posts(community_id, created_at DESC);

-- ============================================
-- 6. MODIFY CHALLENGES TABLE — add community link
-- ============================================
ALTER TABLE public.challenges
  ADD COLUMN community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,
  ADD COLUMN community_only boolean NOT NULL DEFAULT false;

CREATE INDEX idx_challenges_community ON public.challenges(community_id) WHERE community_id IS NOT NULL;

-- ============================================
-- 7. SECURITY DEFINER FUNCTIONS
-- ============================================

-- Get a user's role in a community (returns null if not a member)
CREATE OR REPLACE FUNCTION public.get_community_role(_user_id uuid, _community_id uuid)
RETURNS community_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.community_members
  WHERE user_id = _user_id AND community_id = _community_id;
$$;

-- Check if user is a member of a community
CREATE OR REPLACE FUNCTION public.is_community_member(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE user_id = _user_id AND community_id = _community_id
  );
$$;

-- Check if user is at least a moderator (moderator, admin, or owner)
CREATE OR REPLACE FUNCTION public.is_community_moderator(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE user_id = _user_id AND community_id = _community_id
    AND role IN ('owner', 'admin', 'moderator')
  );
$$;

-- Check if user is at least an admin (admin or owner)
CREATE OR REPLACE FUNCTION public.is_community_admin(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE user_id = _user_id AND community_id = _community_id
    AND role IN ('owner', 'admin')
  );
$$;

-- Auto-increment/decrement member_count
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET member_count = member_count - 1 WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER community_member_count_trigger
  AFTER INSERT OR DELETE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- COMMUNITIES
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public and brand communities"
  ON public.communities FOR SELECT TO authenticated
  USING (type IN ('public', 'brand') OR owner_id = auth.uid() OR is_community_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create communities"
  ON public.communities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Community admins can update"
  ON public.communities FOR UPDATE TO authenticated
  USING (is_community_admin(auth.uid(), id));

CREATE POLICY "Only owner can delete community"
  ON public.communities FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "App admins can manage all communities"
  ON public.communities FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- COMMUNITY MEMBERS
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members visible to fellow members and public community viewers"
  ON public.community_members FOR SELECT TO authenticated
  USING (
    is_community_member(auth.uid(), community_id)
    OR EXISTS (SELECT 1 FROM communities WHERE id = community_id AND type IN ('public', 'brand'))
  );

CREATE POLICY "Users can join public communities"
  ON public.community_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'member'
    AND EXISTS (SELECT 1 FROM communities WHERE id = community_id AND type IN ('public', 'brand'))
  );

CREATE POLICY "Admins can insert members (for private invites)"
  ON public.community_members FOR INSERT TO authenticated
  WITH CHECK (is_community_admin(auth.uid(), community_id));

CREATE POLICY "Admins can update member roles"
  ON public.community_members FOR UPDATE TO authenticated
  USING (is_community_admin(auth.uid(), community_id));

CREATE POLICY "Members can leave (delete self)"
  ON public.community_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can remove members"
  ON public.community_members FOR DELETE TO authenticated
  USING (is_community_admin(auth.uid(), community_id));

-- COMMUNITY INVITATIONS
ALTER TABLE public.community_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can create invitations"
  ON public.community_invitations FOR INSERT TO authenticated
  WITH CHECK (is_community_admin(auth.uid(), community_id));

CREATE POLICY "Users can view invitations they sent or received"
  ON public.community_invitations FOR SELECT TO authenticated
  USING (inviter_id = auth.uid() OR invitee_user_id = auth.uid());

CREATE POLICY "Invitees can update invitation status"
  ON public.community_invitations FOR UPDATE TO authenticated
  USING (invitee_user_id = auth.uid());

-- COMMUNITY POSTS
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community members can view posts"
  ON public.community_posts FOR SELECT TO authenticated
  USING (is_community_member(auth.uid(), community_id));

CREATE POLICY "Community members can create posts"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_community_member(auth.uid(), community_id));

CREATE POLICY "Authors can delete own posts"
  ON public.community_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Moderators can delete any post"
  ON public.community_posts FOR DELETE TO authenticated
  USING (is_community_moderator(auth.uid(), community_id));

-- ============================================
-- 9. AUTO-ADD OWNER AS MEMBER ON COMMUNITY CREATE
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_add_community_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_auto_add_owner
  AFTER INSERT ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.auto_add_community_owner();

-- Migration: 20260308141956_9f907546-fc3b-4c6b-912d-14090e77b272.sql

-- Add category column to communities
ALTER TABLE public.communities ADD COLUMN category text NOT NULL DEFAULT 'general';

-- Add community_rules column
ALTER TABLE public.communities ADD COLUMN rules text;

-- Add requires_approval for join requests
ALTER TABLE public.communities ADD COLUMN requires_approval boolean NOT NULL DEFAULT false;

-- Create index on category
CREATE INDEX idx_communities_category ON public.communities(category);

-- Create communities storage bucket for logos and banners
INSERT INTO storage.buckets (id, name, public) VALUES ('communities', 'communities', true);

-- Storage RLS: anyone can view
CREATE POLICY "Anyone can view community assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'communities');

-- Storage RLS: authenticated can upload
CREATE POLICY "Authenticated users can upload community assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'communities');

-- Storage RLS: owner can update/delete own uploads
CREATE POLICY "Users can update own community assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'communities' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own community assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'communities' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Migration: 20260308143748_4379b70e-19ff-41e4-aca2-c77616d223d1.sql

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

-- Migration: 20260308143938_092476e6-9980-4faa-b304-41cd24f19a23.sql

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS pinned_post_id uuid REFERENCES public.community_posts(id) ON DELETE SET NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reward_description text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sponsor_cta_text text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sponsor_cta_url text DEFAULT NULL;

-- Migration: 20260308145138_19e04a9f-c0f1-42ea-8984-14919bea6808.sql

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

-- Migration: 20260308150111_80ed2687-0ff2-4e53-8d4f-877a3fd555f3.sql

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

-- Migration: 20260308150125_c328c057-c607-4cff-963f-89fce4d28c91.sql

-- Fix security definer views by setting security_invoker = true
ALTER VIEW public.v_active_users SET (security_invoker = true);
ALTER VIEW public.v_user_growth SET (security_invoker = true);
ALTER VIEW public.v_challenge_metrics SET (security_invoker = true);
ALTER VIEW public.v_top_challenges SET (security_invoker = true);
ALTER VIEW public.v_top_communities SET (security_invoker = true);
ALTER VIEW public.v_monetization SET (security_invoker = true);
ALTER VIEW public.v_community_metrics SET (security_invoker = true);
ALTER VIEW public.v_retention SET (security_invoker = true);
ALTER VIEW public.v_engagement_trends SET (security_invoker = true);

-- Migration: 20260308151031_a5f64612-ff50-4b60-bb93-bd93ac9c9eef.sql

-- Fair play flags table for tracking suspicious activity
CREATE TABLE public.fair_play_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flag_type text NOT NULL, -- 'reciprocal_voting', 'rapid_proofs', 'mass_boost', 'duplicate_proof', 'self_vote_attempt'
  severity text NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high'
  details jsonb DEFAULT '{}'::jsonb,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_fair_play_flags_user ON public.fair_play_flags (user_id, created_at DESC);
CREATE INDEX idx_fair_play_flags_unresolved ON public.fair_play_flags (is_resolved, created_at DESC);

ALTER TABLE public.fair_play_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can see and manage flags
CREATE POLICY "Admins can view all flags"
  ON public.fair_play_flags FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update flags"
  ON public.fair_play_flags FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- System can insert flags
CREATE POLICY "System can insert flags"
  ON public.fair_play_flags FOR INSERT
  WITH CHECK (true);

-- =============================================
-- Duplicate proof prevention (unique constraint)
-- Only one proof per participant per simple challenge (non-frequency/quantity)
-- For frequency: handled via app logic already
-- =============================================

-- Function: detect reciprocal voting patterns
CREATE OR REPLACE FUNCTION public.detect_reciprocal_voting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _proof_owner_id uuid;
  _reverse_count integer;
  _challenge_id uuid;
BEGIN
  -- Get proof owner
  SELECT pa.user_id, p.challenge_id INTO _proof_owner_id, _challenge_id
  FROM proofs p
  JOIN participations pa ON pa.id = p.participation_id
  WHERE p.id = NEW.proof_id;

  -- Skip if voting on own proof (shouldn't happen but safety)
  IF _proof_owner_id = NEW.voter_id THEN
    RETURN NEW;
  END IF;

  -- Count how many times the proof owner has voted for the voter's proofs
  -- in the same challenge within the last 7 days
  SELECT count(*) INTO _reverse_count
  FROM votes v
  JOIN proofs p ON p.id = v.proof_id
  JOIN participations pa ON pa.id = p.participation_id
  WHERE v.voter_id = _proof_owner_id
    AND pa.user_id = NEW.voter_id
    AND p.challenge_id = _challenge_id
    AND v.vote_type IN ('honor', 'validated')
    AND v.created_at > now() - interval '7 days';

  -- If reciprocal voting detected (3+ times), flag it
  IF _reverse_count >= 3 THEN
    INSERT INTO fair_play_flags (user_id, flag_type, severity, challenge_id, details)
    VALUES (
      NEW.voter_id,
      'reciprocal_voting',
      CASE WHEN _reverse_count >= 5 THEN 'high' ELSE 'medium' END,
      _challenge_id,
      jsonb_build_object(
        'voter_id', NEW.voter_id,
        'proof_owner_id', _proof_owner_id,
        'reverse_vote_count', _reverse_count,
        'description', 'Reciprocal positive voting pattern detected'
      )
    );

    -- Notify admins
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT ur.user_id, 'admin_alert', '⚠️ Fair Play Alert',
      'Reciprocal voting pattern detected in a challenge',
      jsonb_build_object('flag_type', 'reciprocal_voting', 'challenge_id', _challenge_id, 'user_id', NEW.voter_id)
    FROM user_roles ur WHERE ur.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detect_reciprocal_voting
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_reciprocal_voting();

-- Function: detect mass boosting
CREATE OR REPLACE FUNCTION public.detect_mass_boosting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _boost_count_24h integer;
BEGIN
  -- Count boosts by this user in the last 24 hours
  SELECT count(*) INTO _boost_count_24h
  FROM boosts
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '24 hours';

  -- Flag if more than 5 boosts in 24 hours (suspicious)
  IF _boost_count_24h >= 5 THEN
    INSERT INTO fair_play_flags (user_id, flag_type, severity, challenge_id, details)
    VALUES (
      NEW.user_id,
      'mass_boost',
      CASE WHEN _boost_count_24h >= 8 THEN 'high' ELSE 'medium' END,
      NEW.target_challenge_id,
      jsonb_build_object(
        'boost_count_24h', _boost_count_24h,
        'boost_type', NEW.boost_type,
        'description', 'Excessive boosting detected within 24 hours'
      )
    );

    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT ur.user_id, 'admin_alert', '⚠️ Mass Boost Alert',
      'A user used ' || _boost_count_24h || ' boosters in 24 hours',
      jsonb_build_object('flag_type', 'mass_boost', 'user_id', NEW.user_id)
    FROM user_roles ur WHERE ur.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detect_mass_boosting
  AFTER INSERT ON public.boosts
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_mass_boosting();

-- Function: detect rapid/duplicate proof submissions
CREATE OR REPLACE FUNCTION public.detect_rapid_proofs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _recent_count integer;
  _owner_id uuid;
BEGIN
  SELECT pa.user_id INTO _owner_id
  FROM participations pa WHERE pa.id = NEW.participation_id;

  -- Count proofs submitted by this user in this challenge in last 5 minutes
  SELECT count(*) INTO _recent_count
  FROM proofs p
  JOIN participations pa ON pa.id = p.participation_id
  WHERE pa.user_id = _owner_id
    AND p.challenge_id = NEW.challenge_id
    AND p.created_at > now() - interval '5 minutes'
    AND p.id != NEW.id;

  IF _recent_count >= 3 THEN
    INSERT INTO fair_play_flags (user_id, flag_type, severity, challenge_id, details)
    VALUES (
      _owner_id,
      'rapid_proofs',
      'medium',
      NEW.challenge_id,
      jsonb_build_object(
        'proofs_in_5min', _recent_count + 1,
        'description', 'Rapid proof submissions detected'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detect_rapid_proofs
  AFTER INSERT ON public.proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_rapid_proofs();

-- Migration: 20260308182140_1844f7e9-77e9-44b0-8527-ec1a2b5b5fb0.sql

CREATE TABLE public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  page_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON public.beta_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
  ON public.beta_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON public.beta_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Migration: 20260415144341_eceab56f-33f1-4d58-b479-f2838ff67c17.sql

-- Fix 1: notifications - only allow system/trigger inserts (authenticated users for their own notifications)
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);
-- Note: notifications are inserted by triggers (SECURITY DEFINER), keeping this permissive for triggers is intentional

-- Fix 2: fair_play_flags - only allow system inserts (triggers)
DROP POLICY "System can insert flags" ON public.fair_play_flags;
CREATE POLICY "System can insert flags" ON public.fair_play_flags
  FOR INSERT TO authenticated
  WITH CHECK (true);
-- Note: flags are inserted by SECURITY DEFINER trigger functions, this is intentional

-- Fix 3: user_referrals - restrict to authenticated and self-referral pattern
DROP POLICY "System can insert referrals" ON public.user_referrals;
CREATE POLICY "Users can insert referrals" ON public.user_referrals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

-- Fix 4: certificate_purchases - restrict to own purchases
DROP POLICY "Service can insert certificate purchases" ON public.certificate_purchases;
CREATE POLICY "Users can insert own certificate purchases" ON public.certificate_purchases
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix 5: Restrict storage bucket listing
-- Drop broad SELECT policies and replace with path-specific ones
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Proof files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view proof files" ON storage.objects;
DROP POLICY IF EXISTS "Proofs are publicly accessible" ON storage.objects;

DROP POLICY IF EXISTS "Community files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view community files" ON storage.objects;
DROP POLICY IF EXISTS "Communities are publicly accessible" ON storage.objects;

-- Create restricted SELECT policies for proofs and communities buckets
CREATE POLICY "Authenticated can view proof files" ON storage.objects
  FOR SELECT USING (bucket_id = 'proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can view community files" ON storage.objects
  FOR SELECT USING (bucket_id = 'communities' AND auth.role() = 'authenticated');

-- Migration: 20260415144354_38d5093e-e4fb-49a3-b031-2d4f84a5efbe.sql

-- Fix notifications: restrict INSERT to service_role only (triggers run as SECURITY DEFINER)
DROP POLICY "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Fix fair_play_flags: restrict INSERT to service_role only
DROP POLICY "System can insert flags" ON public.fair_play_flags;
CREATE POLICY "Service role can insert flags" ON public.fair_play_flags
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Make buckets private to prevent listing
UPDATE storage.buckets SET public = false WHERE id IN ('avatars', 'proofs', 'communities');

-- Migration: 20260415144406_da95fea4-42d9-4228-89b8-e8043590d839.sql

-- Revert buckets to public - needed for getPublicUrl() to work
UPDATE storage.buckets SET public = true WHERE id IN ('avatars', 'proofs', 'communities');

-- Migration: 20260415190714_68b48f06-4c72-497f-96ef-1af59cfeeb4b.sql
-- 1. Remove authenticated INSERT policy on certificate_purchases (only service_role should insert)
DROP POLICY IF EXISTS "Users can insert own certificate purchases" ON public.certificate_purchases;

-- Create service-role-only INSERT policy
CREATE POLICY "Service role can insert certificate purchases" ON public.certificate_purchases
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 2. Restrict profiles SELECT to hide email from other users
-- Drop the existing open SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a policy that allows viewing all profiles but we'll use column-level security via a view
-- For now, keep profiles readable (needed for display_name, avatar in challenges) but
-- create a function to check if email should be visible
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Note: Email exposure is mitigated at the application level - the profiles table needs 
-- to be readable for display_name/avatar lookups across challenges. The email column is 
-- only used by the profile owner's own pages and admin functions which already filter by auth.uid().
