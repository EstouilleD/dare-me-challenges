
-- Fix security definer views by setting security_invoker = true
ALTER VIEW public.v_active_users SET (security_invoker = true);
ALTER VIEW public.v_user_growth SET (security_invoker = true);
ALTER VIEW public.v_challenge_metrics SET (security_invoker = true);
ALTER VIEW public.v_top_challenges SET (security_invoker = true);
ALTER VIEW public.v_top_communities SET (security_invoker = true);
ALTER VIEW public.v_monetization SET (security_invoker = true);
ALTER VIEW public.v_community_metrics SET (security_invoker = true);
ALTER VIEW public.v_retention SET (security_invoker = true);
ALTER VIEW public.v_engagement_trends SET (security_invoker = true);
