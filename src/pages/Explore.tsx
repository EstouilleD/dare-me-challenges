import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, TrendingUp, Sparkles, BadgeCheck, LayoutGrid, Users, ChevronRight } from "lucide-react";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import HeaderLogo from "@/components/HeaderLogo";
import { TrendingChallengeCard } from "@/components/TrendingChallengeCard";
import { TrendingCommunityCard } from "@/components/TrendingCommunityCard";
import BurgerMenu from "@/components/BurgerMenu";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  use_avatar: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

const Explore = () => {
  const navigate = useNavigate();
  const { headerClass } = useAutoHideHeader();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [trendingChallenges, setTrendingChallenges] = useState<any[]>([]);
  const [trendingCommunities, setTrendingCommunities] = useState<any[]>([]);
  const [recommendedChallenges, setRecommendedChallenges] = useState<any[]>([]);
  const [featuredBrands, setFeaturedBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    setUserId(session.user.id);

    const { data: p } = await supabase.from("profiles")
      .select("id, display_name, avatar_url, profile_photo_url, use_avatar")
      .eq("id", session.user.id).single();
    setProfile(p);

    // Load all data in parallel
    const [catRes, trendChRes, trendComRes, recRes, brandRes] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.rpc("get_trending_challenges", { _limit: 15 }),
      supabase.rpc("get_trending_communities", { _limit: 10 }),
      supabase.rpc("get_recommended_challenges", { _user_id: session.user.id, _limit: 10 }),
      supabase.from("communities").select("id, name, slug, description, type, category, logo_url, is_verified, member_count, reward_description, banner_url")
        .eq("type", "brand").eq("is_verified", true).order("member_count", { ascending: false }).limit(5),
    ]);

    setCategories(catRes.data || []);
    setTrendingChallenges(trendChRes.data || []);
    setTrendingCommunities(trendComRes.data || []);
    setRecommendedChallenges(recRes.data || []);
    setFeaturedBrands(brandRes.data || []);
    setLoading(false);
  };

  const HorizontalSection = ({ title, icon, children, onSeeAll }: { title: string; icon: React.ReactNode; children: React.ReactNode; onSeeAll?: () => void }) => (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">{icon} {title}</h2>
        {onSeeAll && (
          <Button variant="ghost" size="sm" onClick={onSeeAll} className="text-xs text-muted-foreground gap-1">
            See all <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
        {children}
      </div>
    </section>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {profile && <BurgerMenu profile={profile} />}
            <h1 className="text-xl font-bold text-white">Explore</h1>
            <HeaderLogo />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-6 max-w-lg pb-12">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search challenges & communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>

        {/* Categories */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" /> Categories
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {categories.filter(c => c.slug !== "other").map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/explore/category/${cat.slug}`)}
                className="flex flex-col items-center gap-1 min-w-[64px] px-2 py-2 rounded-xl bg-card border hover:bg-primary/5 hover:border-primary/30 transition-colors"
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Featured Brand Campaigns */}
        {featuredBrands.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" /> Featured Campaigns
            </h2>
            <div className="space-y-3">
              {featuredBrands.map((brand: any) => (
                <Card
                  key={brand.id}
                  className="overflow-hidden cursor-pointer hover:shadow-elevated transition-all"
                  onClick={() => navigate(`/community/${brand.slug}`)}
                >
                  {brand.banner_url && (
                    <div className="h-24 bg-gradient-to-r from-primary/20 to-accent/20">
                      <img src={brand.banner_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover border-2 border-background -mt-8 relative z-10 shadow-card" />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center -mt-8 relative z-10 shadow-card border-2 border-background">
                          <span className="text-lg font-bold text-primary">{brand.name[0]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold truncate">{brand.name}</p>
                          <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{brand.description}</p>
                      </div>
                    </div>
                    {brand.reward_description && (
                      <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">🏆 {brand.reward_description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Trending Challenges */}
        {trendingChallenges.length > 0 && (
          <HorizontalSection
            title="Trending Challenges"
            icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
          >
            {trendingChallenges.map((c: any) => (
              <TrendingChallengeCard key={c.id} challenge={c} />
            ))}
          </HorizontalSection>
        )}

        {/* Trending Communities */}
        {trendingCommunities.length > 0 && (
          <HorizontalSection
            title="Trending Communities"
            icon={<Users className="h-5 w-5 text-blue-500" />}
          >
            {trendingCommunities.map((c: any) => (
              <TrendingCommunityCard key={c.id} community={c} />
            ))}
          </HorizontalSection>
        )}

        {/* Recommended For You */}
        {recommendedChallenges.length > 0 && (
          <HorizontalSection
            title="Recommended For You"
            icon={<Sparkles className="h-5 w-5 text-purple-500" />}
          >
            {recommendedChallenges.map((c: any) => (
              <TrendingChallengeCard key={c.id} challenge={{ ...c, trending_score: c.relevance_score, community_name: null }} />
            ))}
          </HorizontalSection>
        )}

        {/* Empty state */}
        {trendingChallenges.length === 0 && trendingCommunities.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-semibold">Nothing to explore yet</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to create a public challenge!</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Explore;
