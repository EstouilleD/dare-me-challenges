-- Seed coin packs with Stripe price IDs (insert only if stripe_price_id not already present)
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

-- Update is_active and amounts for existing rows that already have these price IDs
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
