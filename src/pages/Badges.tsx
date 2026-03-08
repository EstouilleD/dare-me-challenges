import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import HeaderLogo from "@/components/HeaderLogo";
import BadgeCard from "@/components/BadgeCard";

interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  sort_order: number;
}

interface UserBadge {
  badge_id: string;
  earned_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  creation: "🚀 Creation",
  completion: "🏁 Completion",
  victory: "🏆 Victory",
  excellence: "🎖️ Excellence",
  proof: "📸 Proofs",
  social: "🦋 Social",
  engagement: "⚖️ Engagement",
  special: "💎 Special",
};

const Badges = () => {
  const navigate = useNavigate();
  const { headerClass } = useAutoHideHeader();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    // Trigger badge check
    await supabase.rpc("check_and_award_badges", { _user_id: session.user.id });

    const [badgesRes, userBadgesRes] = await Promise.all([
      supabase.from("badges").select("*").order("sort_order"),
      supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", session.user.id),
    ]);

    setBadges(badgesRes.data || []);
    setUserBadges(userBadgesRes.data || []);
    setLoading(false);
  };

  const earnedMap = new Map(userBadges.map(ub => [ub.badge_id, ub.earned_at]));
  const earnedCount = userBadges.length;
  const totalCount = badges.length;

  // Group by category
  const grouped = badges.reduce<Record<string, Badge[]>>((acc, b) => {
    if (!acc[b.category]) acc[b.category] = [];
    acc[b.category].push(b);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading badges...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 relative">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Badges</h1>
              <p className="text-sm text-white/80">{earnedCount} / {totalCount} earned</p>
            </div>
            <HeaderLogo />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8 max-w-lg">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {earnedCount === totalCount
              ? "🎉 You've unlocked all badges! Amazing!"
              : `${totalCount - earnedCount} badges left to unlock`}
          </p>
        </div>

        {Object.entries(grouped).map(([category, categoryBadges]) => (
          <section key={category} className="space-y-3">
            <h2 className="text-lg font-bold">{CATEGORY_LABELS[category] || category}</h2>
            <div className="grid grid-cols-2 gap-3">
              {categoryBadges.map(badge => (
                <BadgeCard
                  key={badge.id}
                  icon={badge.icon}
                  name={badge.name}
                  description={badge.description}
                  earned={earnedMap.has(badge.id)}
                  earnedAt={earnedMap.get(badge.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default Badges;
