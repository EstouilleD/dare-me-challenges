import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Download, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAvatarSrc } from "@/lib/avatars";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  use_avatar: boolean;
}

interface RankedParticipant {
  user_id: string;
  profile: Profile;
  honorVotes: number;
  avgScore: number;
  proofCount: number;
  firstProofAt: string | null;
}

interface FinalRankingPodiumProps {
  challengeId: string;
}

const FinalRankingPodium = ({ challengeId }: FinalRankingPodiumProps) => {
  const [ranking, setRanking] = useState<RankedParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [hasPurchasedCert, setHasPurchasedCert] = useState(false);
  const [downloadingDiploma, setDownloadingDiploma] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadRanking();
  }, [challengeId]);

  // Handle certificate purchase success
  useEffect(() => {
    if (searchParams.get("certificate") === "purchased") {
      toast({ title: "🎉 Certificate purchased!", description: "You can now download your certificate." });
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("certificate");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams]);

  const loadRanking = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setCurrentUserId(session.user.id);
      const { data } = await supabase.rpc("is_premium", { _user_id: session.user.id });
      setIsPremium(!!data);
      
      // Check if user purchased certificate for this challenge
      const { data: purchase } = await supabase
        .from("certificate_purchases")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("challenge_id", challengeId)
        .maybeSingle();
      setHasPurchasedCert(!!purchase);
    }

    const { data: participations } = await supabase
      .from("participations")
      .select("id, user_id, profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)")
      .eq("challenge_id", challengeId)
      .eq("is_active", true);

    if (!participations || participations.length === 0) {
      setLoading(false);
      return;
    }

    const { data: proofs } = await supabase
      .from("proofs")
      .select("id, participation_id, created_at")
      .eq("challenge_id", challengeId)
      .order("created_at", { ascending: true });

    const proofIds = proofs?.map(p => p.id) || [];
    let votes: any[] = [];
    if (proofIds.length > 0) {
      const { data: voteData } = await supabase
        .from("votes")
        .select("proof_id, vote_type, numeric_score")
        .in("proof_id", proofIds);
      votes = voteData || [];
    }

    const ranked: RankedParticipant[] = participations.map((part: any) => {
      const userProofs = proofs?.filter(p => p.participation_id === part.id) || [];
      const userProofIds = userProofs.map(p => p.id);
      const userVotes = votes.filter(v => userProofIds.includes(v.proof_id));
      const honorVotes = userVotes.filter(v => v.vote_type === "honor").length;
      const validatedVotes = userVotes.filter(v => v.vote_type === "validated" && v.numeric_score != null);
      const avgScore = validatedVotes.length > 0
        ? validatedVotes.reduce((sum: number, v: any) => sum + v.numeric_score, 0) / validatedVotes.length
        : 0;

      return {
        user_id: part.user_id,
        profile: part.profiles as Profile,
        honorVotes,
        avgScore,
        proofCount: userProofs.length,
        firstProofAt: userProofs.length > 0 ? userProofs[0].created_at : null,
      };
    });

    ranked.sort((a, b) => {
      if (b.honorVotes !== a.honorVotes) return b.honorVotes - a.honorVotes;
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      if (b.proofCount !== a.proofCount) return b.proofCount - a.proofCount;
      if (a.firstProofAt && b.firstProofAt) return a.firstProofAt.localeCompare(b.firstProofAt);
      return a.firstProofAt ? -1 : 1;
    });

    setRanking(ranked);
    setLoading(false);
  };

  const handleDownloadDiploma = async () => {
    setDownloadingDiploma(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-diploma", {
        body: { challengeId, userId: currentUserId },
      });
      if (error || data?.error) {
        toast({ variant: "destructive", title: "Certificate unavailable", description: data?.error || error?.message });
        setDownloadingDiploma(false);
        return;
      }
      const svgString = data.svg;
      const canvas = document.createElement("canvas");
      const scale = 3;
      canvas.width = 1190 * scale;
      canvas.height = 842 * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 1190, 842);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = `Certificate-${data.challengeTitle?.replace(/\s+/g, "-")}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);
          toast({ title: "🎓 Certificate downloaded!" });
          setDownloadingDiploma(false);
        }, "image/png", 1.0);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        const fallbackBlob = new Blob([svgString], { type: "image/svg+xml" });
        const fallbackUrl = URL.createObjectURL(fallbackBlob);
        const a = document.createElement("a");
        a.href = fallbackUrl;
        a.download = `Certificate-${data.challengeTitle?.replace(/\s+/g, "-")}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(fallbackUrl);
        toast({ title: "🎓 Certificate downloaded!" });
        setDownloadingDiploma(false);
      };
      img.src = url;
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      setDownloadingDiploma(false);
    }
  };

  const handlePurchaseCertificate = async () => {
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-certificate", {
        body: { challengeId },
      });
      if (error || data?.error) {
        toast({ variant: "destructive", title: "Purchase failed", description: data?.error || error?.message });
        setPurchasing(false);
        return;
      }
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
    setPurchasing(false);
  };

  if (loading || ranking.length === 0) return null;

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);
  const myRank = ranking.findIndex(r => r.user_id === currentUserId);
  const isTop3 = myRank >= 0 && myRank < 3;

  // After purchase redirect, allow download even for non-premium
  const hasPurchased = searchParams.get("certificate") === "purchased";
  const canDownload = isPremium || hasPurchased;

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3.length === 2
    ? [top3[1], top3[0]]
    : [top3[0]];

  const podiumHeights = ["h-24", "h-32", "h-20"];
  const podiumColors = [
    "from-muted to-muted/60",
    "from-primary to-primary/70",
    "from-accent to-accent/60",
  ];
  const podiumLabels = ["2nd", "1st", "3rd"];
  const medalEmojis = ["🥈", "🥇", "🥉"];

  return (
    <Card className="shadow-elevated border-primary overflow-hidden">
      {/* Header banner */}
      <div className="bg-gradient-primary px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className="h-6 w-6 text-white" />
          <h2 className="text-xl font-bold text-white">Final Ranking</h2>
          <Trophy className="h-6 w-6 text-white" />
        </div>
        <p className="text-white/80 text-sm">Challenge completed! Here are the results</p>
      </div>

      <CardContent className="pt-6 pb-4">
        {/* Podium visual */}
        <div className="flex items-end justify-center gap-2 mb-6 px-4">
          {podiumOrder.map((participant, idx) => {
            const label = top3.length >= 3
              ? podiumLabels[idx]
              : top3.length === 2
              ? (idx === 0 ? "2nd" : "1st")
              : "1st";
            const height = top3.length >= 3
              ? podiumHeights[idx]
              : top3.length === 2
              ? (idx === 0 ? "h-24" : "h-32")
              : "h-32";
            const gradient = top3.length >= 3
              ? podiumColors[idx]
              : top3.length === 2
              ? (idx === 0 ? podiumColors[0] : podiumColors[1])
              : podiumColors[1];
            const medal = top3.length >= 3
              ? medalEmojis[idx]
              : top3.length === 2
              ? (idx === 0 ? "🥈" : "🥇")
              : "🥇";

            return (
              <div key={participant.user_id} className="flex flex-col items-center flex-1 max-w-[140px]">
                <div className="relative mb-2">
                  <Avatar className={`${label === "1st" ? "h-16 w-16 ring-4 ring-primary/30" : "h-12 w-12 ring-2 ring-border"} shadow-lg`}>
                    <AvatarImage src={getAvatarSrc(participant.profile)} />
                    <AvatarFallback className="text-sm font-bold">{participant.profile.display_name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 text-lg">{medal}</span>
                </div>
                <p className="text-xs font-semibold text-center truncate w-full mb-1">{participant.profile.display_name}</p>
                {participant.honorVotes > 0 && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 mb-1">⭐ {participant.honorVotes}</Badge>
                )}
                <div className={`w-full ${height} rounded-t-lg bg-gradient-to-t ${gradient} flex items-end justify-center pb-2 shadow-inner`}>
                  <span className="text-xs font-bold text-foreground/70">{label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rest of ranking */}
        {rest.length > 0 && (
          <div className="space-y-1.5 border-t pt-3">
            {rest.map((r, idx) => (
              <div key={r.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors">
                <span className="w-7 text-center font-bold text-sm text-muted-foreground">#{idx + 4}</span>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getAvatarSrc(r.profile)} />
                  <AvatarFallback className="text-xs">{r.profile.display_name[0]}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium truncate">{r.profile.display_name}</span>
                {r.honorVotes > 0 && (
                  <Badge variant="default" className="text-xs">⭐ {r.honorVotes}</Badge>
                )}
                {r.avgScore > 0 && (
                  <Badge variant="secondary" className="text-xs">{r.avgScore.toFixed(1)}</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Certificate actions */}
        {isTop3 && (
          <div className="pt-4 border-t mt-4">
            {canDownload ? (
              <Button
                variant="outline"
                className="w-full gap-2 border-primary/30 hover:bg-primary/5"
                onClick={handleDownloadDiploma}
                disabled={downloadingDiploma}
              >
                {downloadingDiploma ? "Generating certificate..." : (
                  <>
                    <Download className="h-4 w-4" />
                    Download Certificate
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-primary/30 hover:bg-primary/5"
                  onClick={handlePurchaseCertificate}
                  disabled={purchasing}
                >
                  {purchasing ? "Redirecting to checkout..." : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      Buy Certificate — 1,99 €
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Or <button onClick={() => navigate("/store")} className="underline text-primary hover:text-primary/80">upgrade to Premium</button> for unlimited certificates
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinalRankingPodium;
