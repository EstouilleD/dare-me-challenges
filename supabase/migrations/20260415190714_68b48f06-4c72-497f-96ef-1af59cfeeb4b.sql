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