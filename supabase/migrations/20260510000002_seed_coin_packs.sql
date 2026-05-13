-- Create coin-related tables if they don't exist

CREATE TABLE IF NOT EXISTS public.coin_balances (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance    integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS coin_balances_user_id_key ON public.coin_balances(user_id);

CREATE TABLE IF NOT EXISTS public.coin_packs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  coin_amount     integer NOT NULL,
  price_cents     integer NOT NULL,
  stripe_price_id text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount           integer NOT NULL,
  transaction_type text NOT NULL,
  reference_id     text,
  description      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- RPC: get or return 0 for coin balance
CREATE OR REPLACE FUNCTION public.get_coin_balance(_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT balance FROM public.coin_balances WHERE user_id = _user_id),
    0
  );
$$;

-- RLS
ALTER TABLE public.coin_balances    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_packs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own balance"      ON public.coin_balances;
DROP POLICY IF EXISTS "Users can view active packs"     ON public.coin_packs;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.coin_transactions;

CREATE POLICY "Users can view own balance"
  ON public.coin_balances FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view active packs"
  ON public.coin_packs FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can view own transactions"
  ON public.coin_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Seed coin packs (skip if stripe_price_id already present)
INSERT INTO public.coin_packs (name, coin_amount, price_cents, stripe_price_id, is_active)
SELECT name, coin_amount, price_cents, stripe_price_id, true
FROM (VALUES
  ('Starter Pack',  50,  199, 'price_1TWimiIsSHrHtrFigFfDfASJ'),
  ('Popular Pack', 150,  499, 'price_1TWinDIsSHrHtrFiHch5BfXU'),
  ('Value Pack',   350,  999, 'price_1TWinqIsSHrHtrFi2UuFruyK'),
  ('Pro Pack',     750, 1999, 'price_1TWioUIsSHrHtrFiV6Bv4bQy')
) AS v(name, coin_amount, price_cents, stripe_price_id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.coin_packs cp WHERE cp.stripe_price_id = v.stripe_price_id
);

-- Update amounts for rows that already exist with these price IDs
UPDATE public.coin_packs SET
  coin_amount = v.coin_amount,
  price_cents = v.price_cents,
  is_active   = true
FROM (VALUES
  ('price_1TWimiIsSHrHtrFigFfDfASJ',  50,  199),
  ('price_1TWinDIsSHrHtrFiHch5BfXU', 150,  499),
  ('price_1TWinqIsSHrHtrFi2UuFruyK', 350,  999),
  ('price_1TWioUIsSHrHtrFiV6Bv4bQy', 750, 1999)
) AS v(stripe_price_id, coin_amount, price_cents)
WHERE coin_packs.stripe_price_id = v.stripe_price_id;
