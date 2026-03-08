import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      .select("title, description, start_date, end_date, owner_id, challenge_types(name, icon), profiles(display_name)")
      .eq("id", challengeId)
      .single();

    if (!challenge) {
      return new Response(JSON.stringify({ error: "Challenge not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Use the SAME ranking logic as the client (ChallengeRanking.tsx) =====

    // 1. Get all active participants
    const { data: participations } = await supabase
      .from("participations")
      .select("id, user_id, profiles(display_name)")
      .eq("challenge_id", challengeId)
      .eq("is_active", true);

    if (!participations || participations.length === 0) {
      return new Response(JSON.stringify({ error: "No participants found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get all proofs for this challenge
    const { data: proofs } = await supabase
      .from("proofs")
      .select("id, participation_id, created_at")
      .eq("challenge_id", challengeId)
      .order("created_at", { ascending: true });

    // 3. Get all votes for proofs in this challenge
    const proofIds = (proofs || []).map((p: any) => p.id);
    let votes: any[] = [];
    if (proofIds.length > 0) {
      const { data: voteData } = await supabase
        .from("votes")
        .select("proof_id, vote_type, numeric_score")
        .in("proof_id", proofIds);
      votes = voteData || [];
    }

    // 4. Build ranking using honor votes → avg score → first proof time
    const ranked = participations.map((part: any) => {
      const userProofs = (proofs || []).filter((p: any) => p.participation_id === part.id);
      const userProofIds = userProofs.map((p: any) => p.id);
      const userVotes = votes.filter((v: any) => userProofIds.includes(v.proof_id));

      const honorVotes = userVotes.filter((v: any) => v.vote_type === "honor").length;
      const validatedVotes = userVotes.filter((v: any) => v.vote_type === "validated" && v.numeric_score != null);
      const avgScore = validatedVotes.length > 0
        ? validatedVotes.reduce((sum: number, v: any) => sum + v.numeric_score, 0) / validatedVotes.length
        : 0;

      return {
        user_id: part.user_id,
        display_name: part.profiles?.display_name || "Participant",
        honorVotes,
        avgScore,
        proofCount: userProofs.length,
        firstProofAt: userProofs.length > 0 ? userProofs[0].created_at : null,
      };
    });

    // 5. Sort identically to client: honor votes desc, avg score desc, first proof asc
    ranked.sort((a: any, b: any) => {
      if (b.honorVotes !== a.honorVotes) return b.honorVotes - a.honorVotes;
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      if (a.firstProofAt && b.firstProofAt) return a.firstProofAt.localeCompare(b.firstProofAt);
      return a.firstProofAt ? -1 : 1;
    });

    const totalParticipants = ranked.length;

    // Find user rank (0-indexed)
    const userRankIdx = ranked.findIndex((p: any) => p.user_id === userId);
    if (userRankIdx === -1) {
      return new Response(
        JSON.stringify({ error: "User is not in this challenge" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Must be top 3
    if (userRankIdx > 2) {
      return new Response(
        JSON.stringify({ error: "Certificate available for top 3 only" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check premium OR one-time certificate purchase
    const { data: isPremium } = await supabase.rpc("is_premium", {
      _user_id: userId,
    });

    if (!isPremium) {
      const { data: purchase } = await supabase
        .from("certificate_purchases")
        .select("id")
        .eq("user_id", userId)
        .eq("challenge_id", challengeId)
        .maybeSingle();

      if (!purchase) {
        return new Response(
          JSON.stringify({ error: "Premium or certificate purchase required" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const userEntry = ranked[userRankIdx];
    const displayName = userEntry.display_name;
    const rank = userRankIdx + 1;
    const honorVotes = userEntry.honorVotes;
    const avgScore = userEntry.avgScore;
    const ownerName = (challenge as any).profiles?.display_name || "Challenge Director";

    const rankTitles: Record<number, string> = {
      1: "CHAMPION — 1st Place",
      2: "RUNNER-UP — 2nd Place",
      3: "3rd PLACE FINALIST",
    };
    const rankMedals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
    const rankTitle = rankTitles[rank] || `#${rank}`;
    const rankMedal = rankMedals[rank] || "";

    const formatDate = (d: string) =>
      new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    const startDate = formatDate(challenge.start_date);
    const endDate = formatDate(challenge.end_date);
    const issuedDate = formatDate(new Date().toISOString());
    const certId = `DM-${challengeId.slice(0, 4).toUpperCase()}-${userId.slice(0, 4).toUpperCase()}-${rank}`;
    const challengeType = (challenge as any).challenge_types;

    // Build score line for certificate
    const scoreDetails: string[] = [];
    if (honorVotes > 0) scoreDetails.push(`${honorVotes} Honor vote${honorVotes > 1 ? "s" : ""}`);
    if (avgScore > 0) scoreDetails.push(`Avg. score: ${avgScore.toFixed(1)}`);
    const scoreLine = scoreDetails.length > 0 ? scoreDetails.join(" · ") : "Participated";

    // Generate beautiful SVG certificate
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1190" height="842" viewBox="0 0 1190 842">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f0c29"/>
      <stop offset="50%" style="stop-color:#302b63"/>
      <stop offset="100%" style="stop-color:#24243e"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f5d442"/>
      <stop offset="30%" style="stop-color:#e8b923"/>
      <stop offset="70%" style="stop-color:#d4a017"/>
      <stop offset="100%" style="stop-color:#c8960e"/>
    </linearGradient>
    <linearGradient id="goldLight" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#fce38a"/>
      <stop offset="50%" style="stop-color:#f5d442"/>
      <stop offset="100%" style="stop-color:#fce38a"/>
    </linearGradient>
    <linearGradient id="innerBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#fffdf5"/>
      <stop offset="100%" style="stop-color:#faf6e8"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#00000033"/>
    </filter>
    <pattern id="watermark" patternUnits="userSpaceOnUse" width="200" height="200" patternTransform="rotate(30)">
      <text x="100" y="100" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#e8dfc0" opacity="0.3">DARE ME</text>
    </pattern>
  </defs>

  <rect width="1190" height="842" fill="url(#bgGrad)" rx="12"/>
  <rect x="15" y="15" width="1160" height="812" fill="none" stroke="url(#gold)" stroke-width="4" rx="8"/>
  <rect x="22" y="22" width="1146" height="798" fill="none" stroke="url(#goldLight)" stroke-width="1" rx="6"/>
  <rect x="30" y="30" width="1130" height="782" fill="url(#innerBg)" rx="4"/>
  <rect x="30" y="30" width="1130" height="782" fill="url(#watermark)" rx="4"/>

  <g fill="url(#gold)" opacity="0.6">
    <path d="M50,50 Q50,90 90,90 Q70,70 50,50Z"/>
    <path d="M50,50 Q90,50 90,90 Q70,70 50,50Z"/>
    <circle cx="55" cy="55" r="3"/>
    <path d="M1140,50 Q1140,90 1100,90 Q1120,70 1140,50Z"/>
    <path d="M1140,50 Q1100,50 1100,90 Q1120,70 1140,50Z"/>
    <circle cx="1135" cy="55" r="3"/>
    <path d="M50,792 Q50,752 90,752 Q70,772 50,792Z"/>
    <path d="M50,792 Q90,792 90,752 Q70,772 50,792Z"/>
    <circle cx="55" cy="787" r="3"/>
    <path d="M1140,792 Q1140,752 1100,752 Q1120,772 1140,792Z"/>
    <path d="M1140,792 Q1100,792 1100,752 Q1120,772 1140,792Z"/>
    <circle cx="1135" cy="787" r="3"/>
  </g>

  <line x1="200" y1="100" x2="990" y2="100" stroke="url(#gold)" stroke-width="1.5"/>
  <circle cx="200" cy="100" r="4" fill="url(#gold)"/>
  <circle cx="990" cy="100" r="4" fill="url(#gold)"/>
  <circle cx="595" cy="100" r="6" fill="url(#gold)"/>

  <text x="595" y="82" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#b8860b" letter-spacing="8" font-weight="normal">OFFICIAL CERTIFICATE</text>
  <text x="595" y="145" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-weight="bold" fill="#302b63" filter="url(#shadow)">🔥 DARE ME</text>
  <text x="595" y="172" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#8b7355" letter-spacing="6">CERTIFICATE OF ACHIEVEMENT</text>
  
  <line x1="350" y1="192" x2="840" y2="192" stroke="url(#gold)" stroke-width="2"/>
  <line x1="400" y1="197" x2="790" y2="197" stroke="url(#goldLight)" stroke-width="0.5"/>

  <text x="595" y="235" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="#8b7355" font-style="italic">This certifies that</text>
  <text x="595" y="290" text-anchor="middle" font-family="Georgia, serif" font-size="48" font-weight="bold" fill="#1a1a2e" filter="url(#shadow)">${escapeXml(displayName)}</text>
  <line x1="300" y1="305" x2="890" y2="305" stroke="url(#gold)" stroke-width="1.5"/>
  
  <text x="595" y="355" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="url(#gold)" filter="url(#glow)">${rankMedal} ${rankTitle}</text>
  <text x="595" y="400" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#8b7355" font-style="italic">has demonstrated outstanding excellence and dedication in the challenge</text>
  <text x="595" y="445" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="bold" fill="#302b63">"${escapeXml(challenge.title)}"</text>
  <text x="595" y="480" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="#8b7355">${challengeType?.icon || "🏆"} ${challengeType?.name || "Challenge"} · ${escapeXml(scoreLine)} · ${totalParticipants} participants</text>
  <text x="595" y="510" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#a0936e">${startDate} — ${endDate}</text>

  <line x1="200" y1="550" x2="990" y2="550" stroke="url(#gold)" stroke-width="1"/>

  <g transform="translate(230, 630)">
    <circle cx="0" cy="0" r="55" fill="url(#gold)" opacity="0.15"/>
    <circle cx="0" cy="0" r="45" fill="none" stroke="url(#gold)" stroke-width="2"/>
    <circle cx="0" cy="0" r="40" fill="none" stroke="url(#gold)" stroke-width="0.5" stroke-dasharray="3 3"/>
    <text x="0" y="-10" text-anchor="middle" font-family="Georgia, serif" font-size="24">🏆</text>
    <text x="0" y="15" text-anchor="middle" font-family="Georgia, serif" font-size="8" fill="#b8860b" letter-spacing="2">CERTIFIED</text>
    <text x="0" y="27" text-anchor="middle" font-family="Georgia, serif" font-size="7" fill="#b8860b" letter-spacing="1">DARE ME</text>
  </g>

  <g transform="translate(480, 600)">
    <line x1="0" y1="45" x2="230" y2="45" stroke="#b8860b" stroke-width="0.8"/>
    <text x="115" y="28" text-anchor="middle" font-family="'Brush Script MT', 'Segoe Script', cursive" font-size="28" fill="#302b63" transform="rotate(-3, 115, 28)">${escapeXml(ownerName)}</text>
    <text x="115" y="62" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="#8b7355">Challenge Director</text>
  </g>

  <g transform="translate(780, 600)">
    <line x1="0" y1="45" x2="200" y2="45" stroke="#b8860b" stroke-width="0.8"/>
    <text x="100" y="28" text-anchor="middle" font-family="'Brush Script MT', 'Segoe Script', cursive" font-size="28" fill="#302b63" transform="rotate(-2, 100, 28)">Dare Me</text>
    <text x="100" y="62" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="#8b7355">Platform Authority</text>
  </g>

  <g transform="translate(960, 630)">
    <circle cx="0" cy="0" r="55" fill="url(#gold)" opacity="0.15"/>
    <circle cx="0" cy="0" r="45" fill="none" stroke="url(#gold)" stroke-width="2"/>
    <circle cx="0" cy="0" r="40" fill="none" stroke="url(#gold)" stroke-width="0.5" stroke-dasharray="3 3"/>
    <text x="0" y="-5" text-anchor="middle" font-size="30">${rankMedal}</text>
    <text x="0" y="22" text-anchor="middle" font-family="Georgia, serif" font-size="8" fill="#b8860b" letter-spacing="2">#${rank} OF ${totalParticipants}</text>
  </g>

  <line x1="200" y1="730" x2="990" y2="730" stroke="url(#goldLight)" stroke-width="0.5"/>
  <text x="595" y="755" text-anchor="middle" font-family="Georgia, serif" font-size="10" fill="#b8a88a">Issued on ${issuedDate} · Certificate ID: ${certId}</text>
  <text x="595" y="775" text-anchor="middle" font-family="Georgia, serif" font-size="9" fill="#c4b89a">Dare Me — Challenge Yourself, Compete with Friends</text>
</svg>`;

    return new Response(
      JSON.stringify({
        svg,
        displayName,
        rank: rankTitle,
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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
