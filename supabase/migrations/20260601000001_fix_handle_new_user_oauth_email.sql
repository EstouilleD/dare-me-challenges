-- Fix handle_new_user for Google OAuth via PKCE:
-- Supabase may INSERT auth.users with email=NULL and populate it from
-- raw_user_meta_data afterward. The trigger fires on INSERT, so NEW.email
-- can be null for OAuth sign-ins. Fall back to raw_user_meta_data->>'email'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _email text;
  _display_name text;
BEGIN
  _email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');
  _display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(COALESCE(_email, ''), '@', 1)
  );

  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, _email, _display_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
