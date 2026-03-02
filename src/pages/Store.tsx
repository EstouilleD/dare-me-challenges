import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Crown, Coins, Check, Sparkles, Zap, Trophy, Eye } from "lucide-react";
import { usePremium } from "@/hooks/usePremium";

interface CoinPack {
  id: string;
  name: string;
  coin_amount: number;
  price_cents: number;
}

const PREMIUM_PERKS = [
  { icon: Zap, label: "Unlimited challenge creation" },
  { icon: Trophy, label: "Unlimited active participations" },
  { icon: Eye, label: "Surprise challenges (hidden proofs)" },
  { icon: Sparkles, label: "Official branded diplomas (top 3)" },
];

const Store = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { isPremium } = usePremium(userId);

  useEffect(() => {
    loadStore();
  }, []);

  const loadStore = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    setUserId(session.user.id);

    const [packsRes, balanceRes] = await Promise.all([
      supabase.from("coin_packs").select("*").eq("is_active", true).order("price_cents"),
      supabase.rpc("get_coin_balance", { _user_id: session.user.id }),
    ]);

    setCoinPacks(packsRes.data || []);
    setBalance(balanceRes.data ?? 0);
    setLoading(false);
  };

  const handleBuyCoins = (pack: CoinPack) => {
    toast({
      title: "Coming soon!",
      description: `Purchasing ${pack.coin_amount} coins will be available soon via Stripe.`,
    });
  };

  const handleUpgradePremium = () => {
    toast({
      title: "Coming soon!",
      description: "Premium subscription will be available soon via Stripe.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading store...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-gradient-primary border-b shadow-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Store</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-6">
        {/* Current balance */}
        <Card className="shadow-elevated">
          <CardContent className="py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your balance</p>
                <p className="text-2xl font-bold">{balance} 🪙</p>
              </div>
            </div>
            {isPremium && (
              <Badge className="gap-1 bg-primary text-primary-foreground">
                <Crown className="h-3 w-3" /> Premium
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Premium subscription */}
        {!isPremium && (
          <Card className="shadow-elevated border-primary overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary to-accent" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Premium
              </CardTitle>
              <CardDescription>Unlock all features and remove limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2.5">
                {PREMIUM_PERKS.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 text-sm">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    {label}
                  </div>
                ))}
              </div>
              <Button className="w-full gap-2" size="lg" onClick={handleUpgradePremium}>
                <Crown className="h-4 w-4" />
                Upgrade to Premium
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Coin packs */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Coin Packs
          </h2>
          <p className="text-sm text-muted-foreground">
            Use coins for boosts: +1 score or automatic honor votes.
          </p>

          {coinPacks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No coin packs available yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {coinPacks.map((pack) => (
                <Card key={pack.id} className="hover:shadow-elevated transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🪙</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{pack.name}</p>
                      <p className="text-sm text-muted-foreground">{pack.coin_amount} coins</p>
                    </div>
                    <Button variant="default" size="sm" onClick={() => handleBuyCoins(pack)}>
                      ${(pack.price_cents / 100).toFixed(2)}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* What coins do */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">What can you do with coins?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-lg">📈</span>
              <div>
                <p className="font-medium">Score Boost (5 🪙)</p>
                <p className="text-muted-foreground">Add +1 to your participation score</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">⭐</span>
              <div>
                <p className="font-medium">Honor Vote (10 🪙)</p>
                <p className="text-muted-foreground">Auto honor vote on your latest proof</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">⚡</span>
              <div>
                <p className="font-medium">Double Points (15 🪙)</p>
                <p className="text-muted-foreground">Your next proof counts for 2× score</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">🛡️</span>
              <div>
                <p className="font-medium">Shield (12 🪙)</p>
                <p className="text-muted-foreground">Block the next negative vote on your proof</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">🕵️</span>
              <div>
                <p className="font-medium">Spy (8 🪙)</p>
                <p className="text-muted-foreground">See who voted what on your latest proof</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">🗳️</span>
              <div>
                <p className="font-medium">Vote Twice (10 🪙)</p>
                <p className="text-muted-foreground">Vote a second time on any proof</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Store;
