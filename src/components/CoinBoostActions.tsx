import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Coins, TrendingUp, Award } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

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
    description: "Automatically get an honor vote on your latest proof",
    icon: Award,
    cost: 10,
  },
];

const CoinBoostActions = ({ challengeId, participationId, currentUserId, onRefresh }: CoinBoostActionsProps) => {
  const { toast } = useToast();
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

    // Spend coins
    const { data: success } = await supabase.rpc("spend_coins", {
      _user_id: currentUserId,
      _amount: cost,
      _type: boostType,
      _description: `${boostType} boost for challenge`,
      _reference_id: challengeId,
    });

    if (!success) {
      toast({ variant: "destructive", title: "Not enough coins", description: "Purchase more coins to use boosts." });
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
      // Increment participation score by 1
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
      // Find latest proof and add an honor vote
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

    toast({ title: "Boost activated! 🚀", description: `${boostType === "score_boost" ? "+1 Score" : "Honor Vote"} applied.` });
    setLoading(null);
    await loadBalance();
    onRefresh();
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleOpen}>
        <Coins className="h-4 w-4" />
        Boost
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Coin Boosts
            </DialogTitle>
            <DialogDescription>
              Spend coins for a little advantage. Balance: <span className="font-bold text-foreground">{balance ?? "..."} 🪙</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {BOOSTS.map((boost) => (
              <Card key={boost.type} className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <boost.icon className="h-5 w-5 text-primary" />
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
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CoinBoostActions;
