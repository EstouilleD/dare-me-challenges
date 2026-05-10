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