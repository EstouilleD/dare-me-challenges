
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
