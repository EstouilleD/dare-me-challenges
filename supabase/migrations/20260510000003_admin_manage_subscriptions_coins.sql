-- Allow admins to manage subscriptions and coin tables for all users

DROP POLICY IF EXISTS "Admins can manage all subscriptions"   ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage all coin balances"   ON public.coin_balances;
DROP POLICY IF EXISTS "Admins can manage all coin transactions" ON public.coin_transactions;

CREATE POLICY "Admins can manage all subscriptions"
  ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can manage all coin balances"
  ON public.coin_balances FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can manage all coin transactions"
  ON public.coin_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
