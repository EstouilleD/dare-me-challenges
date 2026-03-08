import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Users, Sparkles, ChevronRight, BadgeCheck } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

const OnboardingDiscovery = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<"interests" | "communities" | "challenges">("interests");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [suggestedCommunities, setSuggestedCommunities] = useState<any[]>([]);
  const [trendingChallenges, setTrendingChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    setUserId(session.user.id);

    const [catRes, comRes, chRes] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("communities").select("id, name, slug, description, type, logo_url, is_verified, member_count")
        .in("type", ["public", "brand"]).order("member_count", { ascending: false }).limit(6),
      supabase.rpc("get_trending_challenges", { _limit: 5 }),
    ]);

    setCategories((catRes.data || []).filter((c: any) => c.slug !== "other"));
    setSuggestedCommunities(comRes.data || []);
    setTrendingChallenges(chRes.data || []);
    setLoading(false);
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const saveInterests = async () => {
    if (selectedCategories.length > 0) {
      const inserts = selectedCategories.map(cat_id => ({
        user_id: userId,
        category_id: cat_id,
      }));
      await supabase.from("user_interests").insert(inserts);
    }
    setStep("communities");
  };

  const joinCommunity = async (communityId: string) => {
    const { error } = await supabase.from("community_members").insert({
      community_id: communityId,
      user_id: userId,
    });
    if (!error) {
      toast({ title: "Joined! 🎉" });
      setSuggestedCommunities(prev => prev.filter(c => c.id !== communityId));
    }
  };

  const finish = () => navigate("/");

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
      <p className="text-white/80">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardContent className="p-6 space-y-6">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2">
            {["interests", "communities", "challenges"].map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? "w-8 bg-primary" : "w-4 bg-muted"
                }`}
              />
            ))}
          </div>

          {step === "interests" && (
            <div className="space-y-4">
              <div className="text-center">
                <Sparkles className="h-10 w-10 mx-auto text-primary mb-2" />
                <h2 className="text-xl font-bold">What interests you?</h2>
                <p className="text-sm text-muted-foreground">Pick at least 3 to personalize your feed</p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-all ${
                      selectedCategories.includes(cat.id)
                        ? "bg-primary text-primary-foreground border-primary scale-105"
                        : "bg-card hover:bg-muted border-border"
                    }`}
                  >
                    <span>{cat.icon}</span> {cat.name}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => navigate("/")} className="flex-1">Skip</Button>
                <Button
                  onClick={saveInterests}
                  disabled={selectedCategories.length < 3}
                  className="flex-1 gap-1"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "communities" && (
            <div className="space-y-4">
              <div className="text-center">
                <Users className="h-10 w-10 mx-auto text-primary mb-2" />
                <h2 className="text-xl font-bold">Join a community</h2>
                <p className="text-sm text-muted-foreground">Connect with people who share your interests</p>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {suggestedCommunities.map(com => (
                  <div key={com.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                    {com.logo_url ? (
                      <img src={com.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">{com.name[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-sm truncate">{com.name}</p>
                        {com.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{com.member_count} members</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => joinCommunity(com.id)}>
                      Join
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep("challenges")} className="flex-1">Skip</Button>
                <Button onClick={() => setStep("challenges")} className="flex-1 gap-1">
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "challenges" && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-4xl block mb-2">🔥</span>
                <h2 className="text-xl font-bold">Trending right now</h2>
                <p className="text-sm text-muted-foreground">Jump into a challenge!</p>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {trendingChallenges.map((ch: any) => (
                  <div
                    key={ch.id}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/challenge/${ch.id}`)}
                  >
                    <span className="text-2xl">{ch.type_icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{ch.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{ch.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[8px] px-1 py-0">{ch.status}</Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Users className="h-2.5 w-2.5" /> {ch.participant_count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {trendingChallenges.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">No trending challenges yet — be the first!</p>
                )}
              </div>

              <Button onClick={finish} className="w-full gap-1">
                Let's go! 🚀
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingDiscovery;
