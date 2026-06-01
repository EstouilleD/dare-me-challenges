-- Profile upsert RPC that reads the email directly from auth.users,
-- bypassing any JS-side email retrieval issues (e.g. PKCE sessions where
-- the JWT does not carry the email claim yet).
--
-- SECURITY DEFINER allows access to auth.users from a public function.
-- The caller must be authenticated (auth.uid() returns non-null).
CREATE OR REPLACE FUNCTION public.upsert_own_profile(
  p_display_name      text,
  p_full_name         text,
  p_use_avatar        boolean,
  p_avatar_url        text,
  p_profile_photo_url text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.profiles (
    id, email, display_name, full_name,
    use_avatar, avatar_url, profile_photo_url
  ) VALUES (
    v_uid, v_email, p_display_name, p_full_name,
    p_use_avatar, p_avatar_url, p_profile_photo_url
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name      = EXCLUDED.display_name,
    full_name         = EXCLUDED.full_name,
    use_avatar        = EXCLUDED.use_avatar,
    avatar_url        = EXCLUDED.avatar_url,
    profile_photo_url = EXCLUDED.profile_photo_url,
    email             = COALESCE(public.profiles.email, EXCLUDED.email);
END;
$$;
