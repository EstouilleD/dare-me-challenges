
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
