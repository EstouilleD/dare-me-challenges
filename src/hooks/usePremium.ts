import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const usePremium = (userId: string | null) => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const check = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      setIsPremium(data?.plan === "premium");
      setLoading(false);
    };
    check();
  }, [userId]);

  return { isPremium, loading };
};

export const checkCreationLimit = async (userId: string): Promise<{ allowed: boolean; count: number; limit: number }> => {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (sub?.plan === "premium") return { allowed: true, count: 0, limit: Infinity };

  // Count challenges created this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count } = await supabase
    .from("challenges")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId)
    .gte("created_at", monthStart);

  const current = count ?? 0;
  return { allowed: current < 5, count: current, limit: 5 };
};

export const checkParticipationLimit = async (userId: string): Promise<{ allowed: boolean; count: number; limit: number }> => {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (sub?.plan === "premium") return { allowed: true, count: 0, limit: Infinity };

  const { count } = await supabase
    .from("participations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  const current = count ?? 0;
  return { allowed: current < 8, count: current, limit: 8 };
};
