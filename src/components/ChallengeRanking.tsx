import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Download, Crown, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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

interface ChallengeRankingProps {
  challengeId: string;
  isFinished: boolean;
}

const ChallengeRanking = ({ challengeId, isFinished }: ChallengeRankingProps) => {
  const [ranking, setRanking] = useState<RankedParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [downloadingDiploma, setDownloadingDiploma] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadRanking();
  }, [challengeId]);

  const loadRanking = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setCurrentUserId(session.user.id);
      const { data } = await supabase.rpc("is_premium", { _user_id: session.user.id });
      setIsPremium(!!data);
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

    // Get all proofs for this challenge
    const { data: proofs } = await supabase
      .from("proofs")
      .select("id, participation_id, created_at")
      .eq("challenge_id", challengeId)
      .order("created_at", { ascending: true });

    // Get all votes for proofs in this challenge
    const proofIds = proofs?.map(p => p.id) || [];
    let votes: any[] = [];
    if (proofIds.length > 0) {
      const { data: voteData } = await supabase
        .from("votes")
        .select("proof_id, vote_type, numeric_score")
        .in("proof_id", proofIds);
      votes = voteData || [];
    }

    // Build ranking
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

    // Sort: honor votes desc, avg score desc, proof count desc, first proof asc
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

  // getAvatarSrc imported from @/lib/avatars

  const getMedalEmoji = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return null;
  };

  const handleDownloadDiploma = async () => {
    setDownloadingDiploma(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-diploma", {
        body: { challengeId, userId: currentUserId },
      });

      if (error || data?.error) {
        toast({
          variant: "destructive",
          title: "Certificate unavailable",
          description: data?.error || error?.message || "Could not generate certificate.",
        });
        setDownloadingDiploma(false);
        return;
      }

      // Render SVG to high-res canvas then download as PNG
      const svgString = data.svg;
      const canvas = document.createElement("canvas");
      const scale = 3; // 3x for high quality
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

          toast({ title: "🎓 Certificate downloaded!", description: "Your official certificate has been saved in high quality." });
          setDownloadingDiploma(false);
        }, "image/png", 1.0);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Fallback: download SVG directly
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

  if (loading || ranking.length === 0) return null;

  // Check if current user is in top 3
  const myRank = ranking.findIndex(r => r.user_id === currentUserId);
  const isTop3 = myRank >= 0 && myRank < 3;

  return (
    <Card className={`shadow-elevated ${isFinished ? "border-primary" : "border-accent"}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          {isFinished ? "Final Ranking" : "Current Ranking"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {ranking.map((r, idx) => {
          const medal = getMedalEmoji(idx);
          return (
            <div
              key={r.user_id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                idx === 0 && isFinished ? "bg-primary/10 border border-primary/20" : "hover:bg-accent/50"
              }`}
            >
              <span className="w-7 text-center font-bold text-sm">
                {medal || `#${idx + 1}`}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={getAvatarSrc(r.profile)} />
                <AvatarFallback className="text-xs">{r.profile.display_name[0]}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm font-medium truncate">{r.profile.display_name}</span>
              <div className="flex items-center gap-2">
                {r.honorVotes > 0 && (
                  <Badge variant="default" className="text-xs">
                    ⭐ {r.honorVotes}
                  </Badge>
                )}
                {r.avgScore > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {r.avgScore.toFixed(1)}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}

        {isFinished && isTop3 && (
          <div className="pt-3 border-t mt-3">
            {isPremium ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={handleDownloadDiploma}
                disabled={downloadingDiploma}
              >
                {downloadingDiploma ? (
                  "Generating..."
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download Diploma
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => navigate("/store")}
              >
                <Lock className="h-4 w-4" />
                Download Diploma
                <Badge variant="outline" className="text-xs gap-1 ml-1">
                  <Crown className="h-3 w-3" /> Premium
                </Badge>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChallengeRanking;
