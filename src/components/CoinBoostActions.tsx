import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Coins, TrendingUp, Award, Copy,
  UserPlus, Users, PenTool, Sparkles, CalendarPlus, Star,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

interface CoinBoostActionsProps {
  challengeId: string;
  participationId: string;
  currentUserId: string;
  onRefresh: () => void;
}

const BOOSTS = [
  {
    type: "score_boost",
    label: "+1 Score",
    description: "Add +1 to your participation score",
    icon: TrendingUp,
    cost: 5,
  },
  {
    type: "honor_vote",
    label: "Honor Vote",
    description: "Auto honor vote on your latest proof",
    icon: Award,
    cost: 10,
  },
  {
    type: "vote_twice",
    label: "Vote Twice",
    description: "Vote a second time on any proof",
    icon: Copy,
    cost: 10,
  },
  {
    type: "extra_participation",
    label: "Extra Participation +1",
    description: "Join one more active challenge",
    icon: UserPlus,
    cost: 10,
  },
  {
    type: "extra_participation_3",
    label: "Extra Participation +3",
    description: "Join 3 more active challenges",
    icon: Users,
    cost: 25,
  },
  {
    type: "extra_creation",
    label: "Extra Creation +1",
    description: "Create one additional challenge this month",
    icon: PenTool,
    cost: 20,
  },
  {
    type: "highlighted_proof",
    label: "Highlighted Proof",
    description: "Your proof goes to the top of the feed (marked as boosted)",
    icon: Star,
    cost: 15,
  },
  {
    type: "vote_multiplier",
    label: "Vote Multiplier",
    description: "Your next vote counts double weight",
    icon: Sparkles,
    cost: 20,
  },
  {
    type: "challenge_extend",
    label: "Extend +3 Days",
    description: "Extend the challenge deadline by 3 days (owner only)",
    icon: CalendarPlus,
    cost: 20,
  },
];

const CoinBoostActions = ({ challengeId, participationId, currentUserId, onRefresh }: CoinBoostActionsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [usedInChallenge, setUsedInChallenge] = useState<Set<string>>(new Set());
  const [monthlyCount, setMonthlyCount] = useState(0);

  const loadBalance = async () => {
    const { data } = await supabase.rpc("get_coin_balance", { _user_id: currentUserId });
    setBalance(data ?? 0);
  };

  const loadBoostUsage = async () => {
    // Boosts used in this challenge
    const { data: challengeBoosts } = await supabase
      .from("boosts")
      .select("boost_type")
      .eq("user_id", currentUserId)
      .eq("target_challenge_id", challengeId);
    setUsedInChallenge(new Set((challengeBoosts || []).map(b => b.boost_type)));

    // Boosts used this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("boosts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUserId)
      .gte("created_at", startOfMonth.toISOString());
    setMonthlyCount(count ?? 0);
  };

  const handleOpen = () => {
    loadBalance();
    loadBoostUsage();
    setOpen(true);
  };

  const handleBoost = async (boostType: string, cost: number) => {
    setLoading(boostType);

    const { data: success } = await supabase.rpc("spend_coins", {
      _user_id: currentUserId,
      _amount: cost,
      _type: boostType,
      _description: `${boostType} boost for challenge`,
      _reference_id: challengeId,
    });

    if (!success) {
      toast({ variant: "destructive", title: "Not enough coins", description: "Purchase more coins in the Store." });
      setLoading(null);
      return;
    }

    // Record boost
    await supabase.from("boosts").insert({
      user_id: currentUserId,
      boost_type: boostType,
      coin_cost: cost,
      target_challenge_id: challengeId,
    });

    if (boostType === "score_boost") {
      const { data: part } = await supabase
        .from("participations")
        .select("score")
        .eq("id", participationId)
        .single();
      await supabase
        .from("participations")
        .update({ score: (part?.score ?? 0) + 1 })
        .eq("id", participationId);
    }

    if (boostType === "honor_vote") {
      const { data: latestProof } = await supabase
        .from("proofs")
        .select("id")
        .eq("participation_id", participationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestProof) {
        await supabase.from("votes").insert({
          proof_id: latestProof.id,
          voter_id: currentUserId,
          vote_type: "honor",
        });
      }
    }


    const labels: Record<string, string> = {};
    BOOSTS.forEach((b) => { labels[b.type] = b.label; });

    toast({ title: "Boost activated! 🚀", description: `${labels[boostType] || boostType} applied.` });
    setLoading(null);
    await loadBalance();
    onRefresh();
  };

  // Show first 6 boosters in the quick grid, all in dialog
  const quickBoosts = BOOSTS.slice(0, 6);

  return (
    <Card className="w-full shadow-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Boosts</span>
          </div>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => navigate("/store")}>
            <Coins className="h-3.5 w-3.5" />
            Buy Coins
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {quickBoosts.map((boost) => (
            <button
              key={boost.type}
              onClick={handleOpen}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <boost.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[10px] font-medium leading-tight text-center">{boost.label}</span>
              <span className="text-[10px] text-muted-foreground">{boost.cost} 🪙</span>
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={handleOpen}>
          View all {BOOSTS.length} boosters →
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              All Boosters
            </DialogTitle>
            <DialogDescription>
              Balance: <span className="font-bold text-foreground">{balance ?? "..."} 🪙</span>
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-1 px-1">
            <div className="space-y-2 pb-2">
              {BOOSTS.map((boost) => (
                <div key={boost.type} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <boost.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{boost.label}</p>
                    <p className="text-xs text-muted-foreground">{boost.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={loading === boost.type || (balance !== null && balance < boost.cost)}
                    onClick={() => handleBoost(boost.type, boost.cost)}
                    className="gap-1 flex-shrink-0"
                  >
                    {loading === boost.type ? "..." : `${boost.cost} 🪙`}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Button variant="outline" className="w-full gap-2" onClick={() => { setOpen(false); navigate("/store"); }}>
            <Coins className="h-4 w-4" />
            Get more coins
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CoinBoostActions;
