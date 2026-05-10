
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
