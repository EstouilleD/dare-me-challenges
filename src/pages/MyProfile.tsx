import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Settings, Trophy, Target, CheckCircle, Star, Coins } from "lucide-react";
import BadgeCard from "@/components/BadgeCard";
import PremiumBanner from "@/components/PremiumBanner";
import { usePremium } from "@/hooks/usePremium";

interface ProfileData {
  display_name: string;
  full_name: string | null;
  use_avatar: boolean | null;
  avatar_url: string | null;
  profile_photo_url: string | null;
}

interface Stats {
  challengesJoined: number;
  challengesCompleted: number;
  challengesCreated: number;
  wins: number;
  proofsSubmitted: number;
}

const MyProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ challengesJoined: 0, challengesCompleted: 0, challengesCreated: 0, wins: 0, proofsSubmitted: 0 });
  const [badges, setBadges] = useState<any[]>([]);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const { isPremium } = usePremium(uid);
  const [coinBalance, setCoinBalance] = useState<number>(0);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    const userId = session.user.id;
    setUid(userId);

    const [profileRes, participationsRes, completedRes, createdRes, proofsRes, badgesRes, userBadgesRes, balanceRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("participations").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("participations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_done", true),
      supabase.from("challenges").select("id", { count: "exact", head: true }).eq("owner_id", userId),
      supabase.from("proofs").select("id, participations!inner(user_id)", { count: "exact", head: true }).eq("participations.user_id", userId),
      supabase.from("badges").select("*").order("sort_order"),
      supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", userId),
    ]);

    if (profileRes.data) setProfile(profileRes.data);

    // Count wins
    const { data: finishedParts } = await supabase
      .from("participations")
      .select("challenge_id, score, challenges!inner(status)")
      .eq("user_id", userId)
      .eq("challenges.status", "finished");

    let wins = 0;
    if (finishedParts) {
      for (const p of finishedParts) {
        const { data: topScore } = await supabase
          .from("participations")
          .select("score")
          .eq("challenge_id", p.challenge_id)
          .order("score", { ascending: false })
          .limit(1)
          .single();
        if (topScore && (p.score ?? 0) > 0 && p.score === topScore.score) wins++;
      }
    }

    setStats({
      challengesJoined: participationsRes.count || 0,
      challengesCompleted: completedRes.count || 0,
      challengesCreated: createdRes.count || 0,
      wins,
      proofsSubmitted: proofsRes.count || 0,
    });

    setBadges(badgesRes.data || []);
    setUserBadges(userBadgesRes.data || []);
    setLoading(false);
  };

  const getAvatarSrc = () => {
    if (!profile) return "";
    if (profile.use_avatar && profile.avatar_url) return profile.avatar_url;
    if (profile.profile_photo_url) return profile.profile_photo_url;
    return "";
  };

  const earnedSet = new Set(userBadges.map(ub => ub.badge_id));
  const earnedBadges = badges.filter(b => earnedSet.has(b.id));
  const lockedBadges = badges.filter(b => !earnedSet.has(b.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  const statItems = [
    { icon: Target, label: "Joined", value: stats.challengesJoined },
    { icon: CheckCircle, label: "Completed", value: stats.challengesCompleted },
    { icon: Star, label: "Created", value: stats.challengesCreated },
    { icon: Trophy, label: "Wins", value: stats.wins },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient */}
      <div className="bg-gradient-primary pb-20 pt-4 px-4 relative">
        <div className="container mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="text-white hover:bg-white/20">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 max-w-lg -mt-16 space-y-6 pb-8">
        {/* Avatar + Name card */}
        <div className="flex flex-col items-center">
          <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
            <AvatarImage src={getAvatarSrc()} />
            <AvatarFallback className="text-3xl">{profile?.display_name?.[0]}</AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold mt-3">{profile?.display_name}</h1>
          {profile?.full_name && (
            <p className="text-muted-foreground">{profile.full_name}</p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          {statItems.map(({ icon: Icon, label, value }) => (
            <Card key={label}>
              <CardContent className="p-3 flex flex-col items-center text-center">
                <Icon className="h-5 w-5 text-primary mb-1" />
                <span className="text-xl font-bold">{value}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Proofs stat */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium">Proofs submitted</span>
            <span className="text-lg font-bold text-primary">{stats.proofsSubmitted}</span>
          </CardContent>
        </Card>

        {/* Earned badges */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              🏅 Badges earned
              <span className="text-sm font-normal text-muted-foreground">
                ({userBadges.length}/{badges.length})
              </span>
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/badges")} className="text-primary text-sm">
              View all →
            </Button>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${badges.length > 0 ? (userBadges.length / badges.length) * 100 : 0}%` }}
            />
          </div>

          {earnedBadges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No badges earned yet. Start completing challenges! 🎯
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {earnedBadges.map(badge => {
                const ub = userBadges.find(u => u.badge_id === badge.id);
                return (
                  <BadgeCard
                    key={badge.id}
                    icon={badge.icon}
                    name={badge.name}
                    description={badge.description}
                    earned
                    earnedAt={ub?.earned_at}
                    size="sm"
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Locked badges preview */}
        {lockedBadges.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold">🔒 Next to unlock</h2>
            <div className="grid grid-cols-3 gap-2">
              {lockedBadges.slice(0, 6).map(badge => (
                <BadgeCard
                  key={badge.id}
                  icon={badge.icon}
                  name={badge.name}
                  description={badge.description}
                  earned={false}
                  size="sm"
                />
              ))}
            </div>
            {lockedBadges.length > 6 && (
              <div className="text-center">
                <Button variant="ghost" size="sm" onClick={() => navigate("/badges")} className="text-muted-foreground">
                  +{lockedBadges.length - 6} more badges to discover
                </Button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default MyProfile;
