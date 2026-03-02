import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Coins, TrendingUp, Award, Shield, Zap, Eye, Copy } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
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
    type: "double_points",
    label: "Double Points",
    description: "Your next proof counts for 2× score",
    icon: Zap,
    cost: 15,
  },
  {
    type: "shield",
    label: "Shield",
    description: "Block the next negative vote on your proof",
    icon: Shield,
    cost: 12,
  },
  {
    type: "spy",
    label: "Spy",
    description: "See who voted what on your latest proof",
    icon: Eye,
    cost: 8,
  },
  {
    type: "vote_twice",
    label: "Vote Twice",
    description: "Vote a second time on any proof",
    icon: Copy,
    cost: 10,
  },
];

const CoinBoostActions = ({ challengeId, participationId, currentUserId, onRefresh }: CoinBoostActionsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const loadBalance = async () => {
    const { data } = await supabase.rpc("get_coin_balance", { _user_id: currentUserId });
    setBalance(data ?? 0);
  };

  const handleOpen = () => {
    loadBalance();
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

    if (boostType === "double_points") {
      const { data: part } = await supabase
        .from("participations")
        .select("score")
        .eq("id", participationId)
        .single();

      await supabase
        .from("participations")
        .update({ score: (part?.score ?? 0) + 2 })
        .eq("id", participationId);
    }

    // shield & spy are recorded as boosts, logic handled elsewhere
    const labels: Record<string, string> = {
      score_boost: "+1 Score",
      honor_vote: "Honor Vote",
      double_points: "Double Points",
      shield: "Shield",
      spy: "Spy",
    };

    toast({ title: "Boost activated! 🚀", description: `${labels[boostType] || boostType} applied.` });
    setLoading(null);
    await loadBalance();
    onRefresh();
  };

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

        <div className="grid grid-cols-5 gap-2">
          {BOOSTS.map((boost) => (
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
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Coin Boosts
            </DialogTitle>
            <DialogDescription>
              Balance: <span className="font-bold text-foreground">{balance ?? "..."} 🪙</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
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
          <Button variant="outline" className="w-full gap-2 mt-1" onClick={() => { setOpen(false); navigate("/store"); }}>
            <Coins className="h-4 w-4" />
            Get more coins
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CoinBoostActions;
