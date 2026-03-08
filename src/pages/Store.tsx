import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Crown, Coins, Sparkles, Zap, Trophy, Eye, Gift, Check, Settings } from "lucide-react";
import { usePremium } from "@/hooks/usePremium";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";

interface CoinPack {
  id: string;
  name: string;
  coin_amount: number;
  price_cents: number;
}

const PREMIUM_TIERS = [
  {
    name: "Monthly",
    priceId: "price_1T6bmTIsSHrHtrFi7gSk0Jxf",
    price: "€4.99",
    period: "/month",
    highlight: false,
    badge: null,
  },
  {
    name: "Quarterly",
    priceId: "price_1T6bmsIsSHrHtrFiLjbtyfb4",
    price: "€12.99",
    period: "/3 months",
    highlight: true,
    badge: "Save 13%",
  },
  {
    name: "Yearly",
    priceId: "price_1T6bnBIsSHrHtrFihx3bNQa0",
    price: "€39.99",
    period: "/year",
    highlight: false,
    badge: "Save 33%",
  },
];

const PREMIUM_PERKS = [
  { icon: Zap, label: "Unlimited challenge creation" },
  { icon: Trophy, label: "Unlimited active participations" },
  { icon: Eye, label: "Surprise challenges (hidden proofs)" },
  { icon: Sparkles, label: "Official branded diplomas (top 3)" },
  { icon: Gift, label: "1 free booster per month (your choice!)" },
];

const BOOSTER_CATEGORIES = [
  {
    title: "🏆 Competition Edge",
    description: "Boost your scores and votes to dominate the leaderboard",
    cta: "Want to win? These boosters give you the edge!",
    boosters: [
      { emoji: "📈", name: "Score Boost", cost: 5, desc: "Add +1 to your participation score" },
      { emoji: "⭐", name: "Honor Vote", cost: 10, desc: "Auto honor vote on your latest proof" },
      { emoji: "🗳️", name: "Vote Twice", cost: 10, desc: "Vote a second time on any proof" },
      { emoji: "✖️", name: "Vote Multiplier", cost: 20, desc: "Your next vote counts double weight" },
    ],
  },
  {
    title: "🚀 Unlock More",
    description: "Expand your limits and do more",
    cta: "Hit your limits? Break through with extra slots!",
    boosters: [
      { emoji: "👤", name: "Extra Participation +1", cost: 10, desc: "Join one more active challenge" },
      { emoji: "👥", name: "Extra Participation +3", cost: 25, desc: "Join 3 more active challenges" },
      { emoji: "✏️", name: "Extra Creation +1", cost: 20, desc: "Create one additional challenge this month" },
    ],
  },
  {
    title: "✨ Visibility & Control",
    description: "Stand out and manage your challenges",
    cta: "Make your proof shine and extend the fun!",
    boosters: [
      { emoji: "💫", name: "Highlighted Proof", cost: 15, desc: "Your proof goes to the top of the feed (marked as boosted)" },
      { emoji: "📅", name: "Extend +3 Days", cost: 20, desc: "Extend the challenge deadline by 3 days (owner only)" },
    ],
  },
];

const Store = () => {
  const navigate = useNavigate();
  const { headerClass } = useAutoHideHeader();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const { isPremium } = usePremium(userId);

  useEffect(() => {
    loadStore();
  }, []);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({ title: "🎉 Welcome to Premium!", description: "Your subscription is now active." });
      // Sync subscription status
      supabase.functions.invoke("check-subscription");
    }
    if (searchParams.get("canceled") === "true") {
      toast({ title: "Checkout canceled", description: "No charges were made." });
    }
  }, [searchParams]);

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
      description: `Purchasing ${pack.coin_amount} coins will be available soon.`,
    });
  };

  const handleCheckout = async (priceId: string) => {
    setCheckingOut(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Checkout failed", description: err.message });
    } finally {
      setCheckingOut(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
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
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
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
        {!isPremium ? (
          <section className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Go Premium
              </h2>
              <p className="text-sm text-muted-foreground">Unlock all features & remove limits</p>
            </div>

            {/* Perks */}
            <Card className="shadow-elevated border-primary/30 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary to-accent" />
              <CardContent className="py-4 space-y-2.5">
                {PREMIUM_PERKS.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 text-sm">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    {label}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Pricing tiers */}
            <div className="grid gap-3">
              {PREMIUM_TIERS.map((tier) => (
                <Card
                  key={tier.priceId}
                  className={`shadow-card transition-shadow hover:shadow-elevated ${
                    tier.highlight ? "border-primary ring-1 ring-primary/20" : ""
                  }`}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{tier.name}</p>
                        {tier.badge && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {tier.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="text-lg font-bold text-foreground">{tier.price}</span>
                        {tier.period}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleCheckout(tier.priceId)}
                      disabled={checkingOut === tier.priceId}
                      variant={tier.highlight ? "default" : "outline"}
                      size="sm"
                    >
                      {checkingOut === tier.priceId ? "..." : "Subscribe"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : (
          <Card className="shadow-elevated border-primary/30 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary to-accent" />
            <CardContent className="py-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Premium Active</p>
                  <p className="text-xs text-muted-foreground">You have access to all features + 1 free booster/month</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleManageSubscription}>
                <Settings className="h-4 w-4" />
                Manage Subscription
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
            Use coins to activate boosters in your challenges.
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
                      €{(pack.price_cents / 100).toFixed(2)}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Boosters catalog by category */}
        {BOOSTER_CATEGORIES.map((cat) => (
          <section key={cat.title} className="space-y-3">
            <div>
              <h2 className="text-lg font-bold">{cat.title}</h2>
              <p className="text-sm text-muted-foreground">{cat.description}</p>
            </div>
            <div className="grid gap-2.5">
              {cat.boosters.map((b) => (
                <div key={b.name} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-card transition-shadow">
                  <span className="text-lg flex-shrink-0">{b.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary flex-shrink-0">{b.cost} 🪙</span>
                </div>
              ))}
            </div>
            {/* Contextual CTA */}
            <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-2">{cat.cta}</p>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => {
                const coinSection = document.getElementById("coin-packs");
                coinSection?.scrollIntoView({ behavior: "smooth" });
              }}>
                <Coins className="h-3 w-3" /> Get Coins
              </Button>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default Store;
