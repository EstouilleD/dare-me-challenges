import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Generate a session ID per browser tab
const SESSION_ID = crypto.randomUUID();

export type AnalyticsEvent =
  | "signup"
  | "profile_completed"
  | "challenge_created"
  | "challenge_joined"
  | "challenge_completed"
  | "proof_submitted"
  | "vote_submitted"
  | "booster_used"
  | "premium_subscribed"
  | "certificate_purchased"
  | "community_created"
  | "community_joined"
  | "challenge_shared"
  | "page_view";

export const trackEvent = async (
  eventName: AnalyticsEvent,
  eventData: Record<string, unknown> = {}
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("analytics_events" as any).insert({
      user_id: user?.id ?? null,
      event_name: eventName,
      event_data: eventData,
      session_id: SESSION_ID,
    } as any);
  } catch (e) {
    // Silent fail — analytics should never break UX
    console.debug("[analytics]", e);
  }
};

export const useTrackEvent = () => {
  return useCallback(
    (eventName: AnalyticsEvent, eventData: Record<string, unknown> = {}) =>
      trackEvent(eventName, eventData),
    []
  );
};
