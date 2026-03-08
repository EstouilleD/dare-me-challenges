import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ArrowLeft, Trophy, XCircle } from "lucide-react";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";

interface HistoryChallenge {
  id: string;
  title: string;
  description: string;
  end_date: string;
  status: string;
  challenge_types: { icon: string; name: string } | null;
  score: number | null;
  isWin: boolean;
}

const ChallengeHistory = () => {
  const navigate = useNavigate();
  const { headerClass } = useAutoHideHeader();
  const [challenges, setChallenges] = useState<HistoryChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      // Get completed challenges where user participated
      const { data } = await supabase
        .from("participations")
        .select(`
          score, is_done, challenge_id,
          challenges!inner(
            id, title, description, end_date, status,
            challenge_types(id, name, icon)
          )
        `)
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .in("challenges.status", ["completed", "ended"]);

      if (data) {
        // For each challenge, check if user had highest score (win)
        const enriched: HistoryChallenge[] = [];
        for (const p of data) {
          const c = p.challenges as any;
          if (!c) continue;

          // Get max score for this challenge
          const { data: topScorer } = await supabase
            .from("participations")
            .select("score, user_id")
            .eq("challenge_id", c.id)
            .eq("is_active", true)
            .order("score", { ascending: false })
            .limit(1)
            .single();

          const { data: { session: s } } = await supabase.auth.getSession();

          enriched.push({
            id: c.id,
            title: c.title,
            description: c.description,
            end_date: c.end_date,
            status: c.status,
            challenge_types: c.challenge_types,
            score: p.score,
            isWin: topScorer?.user_id === s?.user.id && (topScorer?.score || 0) > 0,
          });
        }
        setChallenges(enriched);
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const wins = challenges.filter(c => c.isWin);
  const losses = challenges.filter(c => !c.isWin);

  const ChallengeCard = ({ challenge }: { challenge: HistoryChallenge }) => (
    <Card className="cursor-pointer hover:shadow-elevated transition-all hover:scale-[1.02]" onClick={() => navigate(`/challenge/${challenge.id}`)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">{challenge.challenge_types?.icon}</span>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate">{challenge.title}</CardTitle>
              <CardDescription className="line-clamp-2 text-sm">{challenge.description}</CardDescription>
            </div>
          </div>
          <Badge variant={challenge.isWin ? "default" : "secondary"} className="flex-shrink-0">
            {challenge.isWin ? "🏆 Win" : "Lost"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Score: {challenge.score ?? 0}</span>
          <span>Ended {format(new Date(challenge.end_date), "MMM d, yyyy")}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white hover:bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Old Challenges</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : challenges.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No completed challenges yet.</CardContent></Card>
        ) : (
          <Tabs defaultValue="wins">
            <TabsList className="w-full">
              <TabsTrigger value="wins" className="flex-1 gap-1">
                <Trophy className="h-4 w-4" /> Wins ({wins.length})
              </TabsTrigger>
              <TabsTrigger value="losses" className="flex-1 gap-1">
                <XCircle className="h-4 w-4" /> Losses ({losses.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="wins" className="space-y-4 mt-4">
              {wins.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No wins yet. Keep going! 💪</CardContent></Card>
              ) : wins.map(c => <ChallengeCard key={c.id} challenge={c} />)}
            </TabsContent>
            <TabsContent value="losses" className="space-y-4 mt-4">
              {losses.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No losses. You're undefeated! 🎉</CardContent></Card>
              ) : losses.map(c => <ChallengeCard key={c.id} challenge={c} />)}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default ChallengeHistory;
