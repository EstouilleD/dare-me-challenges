import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { challengeId, userId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get challenge info
    const { data: challenge } = await supabase
      .from("challenges")
      .select("title, description, start_date, end_date, challenge_types(name, icon)")
      .eq("id", challengeId)
      .single();

    if (!challenge) {
      return new Response(JSON.stringify({ error: "Challenge not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get top 3 participants
    const { data: topParticipants } = await supabase
      .from("participations")
      .select("user_id, score, profiles(display_name)")
      .eq("challenge_id", challengeId)
      .eq("is_active", true)
      .order("score", { ascending: false })
      .limit(3);

    // Check user is in top 3
    const userRank = topParticipants?.findIndex(
      (p: any) => p.user_id === userId
    );
    if (userRank === undefined || userRank === -1) {
      return new Response(
        JSON.stringify({ error: "User is not in the top 3" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check premium
    const { data: isPremium } = await supabase.rpc("is_premium", {
      _user_id: userId,
    });
    if (!isPremium) {
      return new Response(
        JSON.stringify({ error: "Premium required for diploma export" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userProfile = (topParticipants as any)?.[userRank]?.profiles;
    const rankLabels = ["1st Place 🥇", "2nd Place 🥈", "3rd Place 🥉"];
    const rankLabel = rankLabels[userRank];
    const score = (topParticipants as any)?.[userRank]?.score ?? 0;

    const startDate = new Date(challenge.start_date).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    );
    const endDate = new Date(challenge.end_date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Generate SVG-based diploma (converts well to PDF via client)
    const diplomaSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f5c842;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e0a800;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="800" height="600" fill="url(#bg)" rx="20" />
      <rect x="20" y="20" width="760" height="560" fill="white" rx="12" opacity="0.95" />
      
      <!-- Border decoration -->
      <rect x="30" y="30" width="740" height="540" fill="none" stroke="url(#gold)" stroke-width="3" rx="8" stroke-dasharray="12 4" />
      
      <!-- Header -->
      <text x="400" y="90" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="#888" letter-spacing="4">CERTIFICATE OF ACHIEVEMENT</text>
      
      <!-- App name -->
      <text x="400" y="130" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#667eea">🔥 DARE ME</text>
      
      <!-- Divider -->
      <line x1="200" y1="150" x2="600" y2="150" stroke="url(#gold)" stroke-width="2" />
      
      <!-- Rank -->
      <text x="400" y="200" text-anchor="middle" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="#333">${rankLabel}</text>
      
      <!-- Name -->
      <text x="400" y="260" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="#555">Awarded to</text>
      <text x="400" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="#222">${userProfile?.display_name || "Participant"}</text>
      
      <!-- Challenge -->
      <text x="400" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#888">for outstanding performance in</text>
      <text x="400" y="395" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="#667eea">"${challenge.title}"</text>
      
      <!-- Score -->
      <text x="400" y="440" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#888">Score: ${score} points · ${(challenge as any).challenge_types?.icon} ${(challenge as any).challenge_types?.name}</text>
      
      <!-- Dates -->
      <text x="400" y="480" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#aaa">${startDate} — ${endDate}</text>
      
      <!-- Footer -->
      <line x1="250" y1="520" x2="550" y2="520" stroke="#ddd" stroke-width="1" />
      <text x="400" y="550" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#bbb">Dare Me · Official Certificate · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</text>
    </svg>`;

    return new Response(
      JSON.stringify({
        svg: diplomaSvg,
        displayName: userProfile?.display_name,
        rank: rankLabel,
        challengeTitle: challenge.title,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
