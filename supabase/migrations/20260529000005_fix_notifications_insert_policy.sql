-- The existing "System can insert notifications" policy had no TO clause,
-- meaning it applied to PUBLIC but not reliably to the `authenticated` role
-- in Supabase's RLS implementation. Sender users (authenticated) could not
-- insert notifications for recipients, so invite notifications were silently dropped.

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
