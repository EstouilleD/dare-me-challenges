import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const results: string[] = [];

    // ========== UPDATE CHALLENGE STATUSES ==========
    // Transition active challenges past their end_date to 'finished', and upcoming to 'active'
    await supabase.rpc("update_challenge_status");
    results.push("Status update: done");

    // ========== CHALLENGE ENDED NOTIFICATION ==========
    // Find challenges that just finished (end_date passed, status still 'active')
    // The update_challenge_status function sets them to 'finished', so we look for
    // recently finished challenges that haven't been notified yet
    const { data: justFinished } = await supabase
      .from("challenges")
      .select("id, title")
      .eq("status", "active")
      .lte("end_date", now.toISOString());

    for (const challenge of justFinished || []) {
      const { data: participants } = await supabase
        .from("participations")
        .select("user_id")
        .eq("challenge_id", challenge.id)
        .eq("is_active", true);

      // Also notify the owner
      const { data: challengeData } = await supabase
        .from("challenges")
        .select("owner_id")
        .eq("id", challenge.id)
        .single();

      const userIds = new Set((participants || []).map(p => p.user_id));
      if (challengeData?.owner_id) userIds.add(challengeData.owner_id);

      for (const userId of userIds) {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("type", "challenge_ended")
          .eq("data->>challenge_id", challenge.id);

        if ((count ?? 0) === 0) {
          await supabase.from("notifications").insert({
            user_id: userId,
            type: "challenge_ended",
            title: "🏁 Challenge finished!",
            message: `"${challenge.title}" has ended! Check the final ranking and see how you did!`,
            data: { challenge_id: challenge.id },
          });
        }
      }
    }
    results.push(`Ended: ${(justFinished || []).length} challenges`);

    // ========== TIME NOTIFICATIONS ==========

    // J-7: Challenge ends in 7 days
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStart = new Date(in7Days);
    in7DaysStart.setHours(0, 0, 0, 0);
    const in7DaysEnd = new Date(in7Days);
    in7DaysEnd.setHours(23, 59, 59, 999);

    const { data: challengesJ7 } = await supabase
      .from("challenges")
      .select("id, title")
      .eq("status", "active")
      .gte("end_date", in7DaysStart.toISOString())
      .lte("end_date", in7DaysEnd.toISOString());

    for (const challenge of challengesJ7 || []) {
      const { data: participants } = await supabase
        .from("participations")
        .select("user_id")
        .eq("challenge_id", challenge.id)
        .eq("is_active", true);

      for (const p of participants || []) {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", p.user_id)
          .eq("type", "deadline_j7")
          .eq("data->>challenge_id", challenge.id);

        if ((count ?? 0) === 0) {
          await supabase.from("notifications").insert({
            user_id: p.user_id,
            type: "deadline_j7",
            title: "⏳ 7 days left!",
            message: `The challenge "${challenge.title}" ends in 7 days!`,
            data: { challenge_id: challenge.id },
          });
        }
      }
    }
    results.push(`J-7: ${(challengesJ7 || []).length} challenges`);

    // J-1: Challenge ends tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const { data: challengesJ1 } = await supabase
      .from("challenges")
      .select("id, title")
      .eq("status", "active")
      .gte("end_date", tomorrowStart.toISOString())
      .lte("end_date", tomorrowEnd.toISOString());

    for (const challenge of challengesJ1 || []) {
      const { data: participants } = await supabase
        .from("participations")
        .select("user_id")
        .eq("challenge_id", challenge.id)
        .eq("is_active", true);

      for (const p of participants || []) {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", p.user_id)
          .eq("type", "deadline_j1")
          .eq("data->>challenge_id", challenge.id);

        if ((count ?? 0) === 0) {
          await supabase.from("notifications").insert({
            user_id: p.user_id,
            type: "deadline_j1",
            title: "⚡ Last day tomorrow!",
            message: `The challenge "${challenge.title}" ends tomorrow!`,
            data: { challenge_id: challenge.id },
          });
        }
      }
    }
    results.push(`J-1: ${(challengesJ1 || []).length} challenges`);

    // Day of end: Challenge ends today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const { data: challengesToday } = await supabase
      .from("challenges")
      .select("id, title")
      .eq("status", "active")
      .gte("end_date", todayStart.toISOString())
      .lte("end_date", todayEnd.toISOString());

    for (const challenge of challengesToday || []) {
      const { data: participants } = await supabase
        .from("participations")
        .select("user_id")
        .eq("challenge_id", challenge.id)
        .eq("is_active", true);

      for (const p of participants || []) {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", p.user_id)
          .eq("type", "deadline_today")
          .eq("data->>challenge_id", challenge.id);

        if ((count ?? 0) === 0) {
          await supabase.from("notifications").insert({
            user_id: p.user_id,
            type: "deadline_today",
            title: "🔥 Last day!",
            message: `"${challenge.title}" ends today! Make sure to submit your proof!`,
            data: { challenge_id: challenge.id },
          });
        }
      }
    }
    results.push(`Day-of: ${(challengesToday || []).length} challenges`);

    // ========== FREQUENCY REMINDERS ==========
    const { data: freqChallenges } = await supabase
      .from("challenges")
      .select("id, title, frequency_period, frequency_quantity")
      .eq("status", "active")
      .not("frequency_period", "is", null);

    for (const challenge of freqChallenges || []) {
      const periodHours = challenge.frequency_period === "daily" ? 24
        : challenge.frequency_period === "weekly" ? 168
        : challenge.frequency_period === "monthly" ? 720
        : null;

      if (!periodHours) continue;

      const cutoff = new Date(now);
      cutoff.setHours(cutoff.getHours() - periodHours);

      const { data: participants } = await supabase
        .from("participations")
        .select("id, user_id")
        .eq("challenge_id", challenge.id)
        .eq("is_active", true)
        .eq("is_done", false);

      for (const p of participants || []) {
        const { count: proofCount } = await supabase
          .from("proofs")
          .select("id", { count: "exact", head: true })
          .eq("participation_id", p.id)
          .gte("created_at", cutoff.toISOString());

        if ((proofCount ?? 0) === 0) {
          const oneDayAgo = new Date(now);
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          const { count: recentNotif } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", p.user_id)
            .eq("type", "frequency_reminder")
            .eq("data->>challenge_id", challenge.id)
            .gte("created_at", oneDayAgo.toISOString());

          if ((recentNotif ?? 0) === 0) {
            await supabase.from("notifications").insert({
              user_id: p.user_id,
              type: "frequency_reminder",
              title: "🔔 Time to post!",
              message: `Don't forget to submit your proof for "${challenge.title}"!`,
              data: { challenge_id: challenge.id },
            });
          }
        }
      }
    }
    results.push(`Frequency: ${(freqChallenges || []).length} challenges checked`);

    // ========== BEHAVIORAL NUDGES ==========

    // 1. "You haven't submitted proof yet"
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: activeChallenges } = await supabase
      .from("challenges")
      .select("id, title")
      .eq("status", "active")
      .lte("start_date", twoDaysAgo.toISOString());

    for (const challenge of activeChallenges || []) {
      const { data: participants } = await supabase
        .from("participations")
        .select("id, user_id")
        .eq("challenge_id", challenge.id)
        .eq("is_active", true)
        .eq("is_done", false);

      for (const p of participants || []) {
        const { count: proofCount } = await supabase
          .from("proofs")
          .select("id", { count: "exact", head: true })
          .eq("participation_id", p.id);

        if ((proofCount ?? 0) === 0) {
          const { count: alreadyNotified } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", p.user_id)
            .eq("type", "no_proof_yet")
            .eq("data->>challenge_id", challenge.id);

          if ((alreadyNotified ?? 0) === 0) {
            await supabase.from("notifications").insert({
              user_id: p.user_id,
              type: "no_proof_yet",
              title: "📸 No proof yet!",
              message: `You haven't submitted any proof for "${challenge.title}" yet. Get started!`,
              data: { challenge_id: challenge.id },
            });
          }
        }
      }
    }
    results.push(`No-proof nudge: checked`);

    // 2. "Only 2 days left to join"
    const in2Days = new Date(now);
    in2Days.setDate(in2Days.getDate() + 2);
    const in2DaysStart = new Date(in2Days);
    in2DaysStart.setHours(0, 0, 0, 0);
    const in2DaysEnd = new Date(in2Days);
    in2DaysEnd.setHours(23, 59, 59, 999);

    const { data: soonEndPublic } = await supabase
      .from("challenges")
      .select("id, title, owner_id")
      .eq("status", "active")
      .eq("is_public", true)
      .gte("end_date", in2DaysStart.toISOString())
      .lte("end_date", in2DaysEnd.toISOString());

    for (const challenge of soonEndPublic || []) {
      const { data: invited } = await supabase
        .from("invitations")
        .select("recipient_user_id")
        .eq("challenge_id", challenge.id)
        .eq("status", "pending")
        .not("recipient_user_id", "is", null);

      for (const inv of invited || []) {
        if (!inv.recipient_user_id) continue;
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", inv.recipient_user_id)
          .eq("type", "join_deadline")
          .eq("data->>challenge_id", challenge.id);

        if ((count ?? 0) === 0) {
          await supabase.from("notifications").insert({
            user_id: inv.recipient_user_id,
            type: "join_deadline",
            title: "⏰ Only 2 days left to join!",
            message: `"${challenge.title}" is ending soon. Join before it's too late!`,
            data: { challenge_id: challenge.id },
          });
        }
      }
    }
    results.push(`Join deadline nudge: checked`);

    // 3. "Your participation slot is full"
    const { data: activeParticipants } = await supabase
      .from("participations")
      .select("user_id")
      .eq("is_active", true)
      .eq("is_done", false);

    const userCounts: Record<string, number> = {};
    for (const p of activeParticipants || []) {
      userCounts[p.user_id] = (userCounts[p.user_id] || 0) + 1;
    }

    for (const [userId, count] of Object.entries(userCounts)) {
      const { data: isPremium } = await supabase.rpc("is_premium", { _user_id: userId });
      const maxSlots = isPremium ? 5 : 3;

      if (count >= maxSlots) {
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const { count: recentNotif } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("type", "slots_full")
          .gte("created_at", oneWeekAgo.toISOString());

        if ((recentNotif ?? 0) === 0) {
          await supabase.from("notifications").insert({
            user_id: userId,
            type: "slots_full",
            title: "🔒 Participation slots full!",
            message: `You've reached your maximum of ${maxSlots} active challenges. Complete one to join more!`,
            data: {},
          });
        }
      }
    }
    results.push(`Slots full nudge: checked`);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
