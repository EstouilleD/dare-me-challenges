import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  const signature = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response("Ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const { type, user_id, coin_amount } = session.metadata ?? {};

  if (type !== "coin_purchase" || !user_id || !coin_amount) {
    return new Response("Not a coin purchase", { status: 200 });
  }

  const coins = parseInt(coin_amount, 10);
  if (isNaN(coins) || coins <= 0) {
    return new Response("Invalid coin amount", { status: 400 });
  }

  // Use service role key so we can bypass RLS and write to coin tables
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Upsert coin balance — add coins to any existing balance
  const { data: existing } = await supabase
    .from("coin_balances")
    .select("balance")
    .eq("user_id", user_id)
    .single();

  const newBalance = (existing?.balance ?? 0) + coins;

  const { error: balanceError } = await supabase
    .from("coin_balances")
    .upsert({ user_id, balance: newBalance }, { onConflict: "user_id" });

  if (balanceError) {
    console.error("Failed to update coin balance:", balanceError);
    return new Response("Failed to update coin balance", { status: 500 });
  }

  // Record the transaction
  const { error: txError } = await supabase
    .from("coin_transactions")
    .insert({
      user_id,
      amount: coins,
      type: "purchase",
      description: `Stripe checkout ${session.id}`,
    });

  if (txError) {
    console.error("Failed to record coin transaction:", txError);
    // Balance was updated — don't fail the webhook, just log it
  }

  console.log(`Credited ${coins} coins to user ${user_id}`);
  return new Response("OK", { status: 200 });
});
