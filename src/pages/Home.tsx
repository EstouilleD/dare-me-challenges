import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Compass, ChevronDown, Coins } from "lucide-react";
import logo from "@/assets/logo.png";
import BurgerMenu from "@/components/BurgerMenu";
import NotificationBell from "@/components/NotificationBell";
import PremiumBanner from "@/components/PremiumBanner";
import { usePremium } from "@/hooks/usePremium";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  use_avatar: boolean;
}

interface ChallengeType {
  id: string;
  name: string;
  icon: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  end_date: string;
  status: string;
  is_public: boolean;
  challenge_types: ChallengeType;
  profiles: Profile;
}

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myChallenges, setMyChallenges] = useState<Challenge[]>([]);
  const [createdChallenges, setCreatedChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [myVisible, setMyVisible] = useState(5);
  const [createdVisible, setCreatedVisible] = useState(5);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Load profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (!profileData?.full_name && !profileData?.avatar_url && !profileData?.profile_photo_url) {
      navigate("/profile-setup");
      return;
    }

    setProfile(profileData);

    // Load challenges to complete (user participations)
    const { data: participations } = await supabase
      .from("participations")
      .select(`
        challenge_id,
        challenges!inner(
          id,
          title,
          description,
          end_date,
          status,
          is_public,
          challenge_types(id, name, icon),
          profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)
        )
      `)
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .eq("challenges.status", "active");

    const myActiveChallenges = participations?.map(p => p.challenges).filter(Boolean) as Challenge[] || [];
    setMyChallenges(myActiveChallenges);

    // Load created challenges
    const { data: created } = await supabase
      .from("challenges")
      .select(`
        *,
        challenge_types(id, name, icon),
        profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)
      `)
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });

    setCreatedChallenges(created as Challenge[] || []);

    // Check badges and notify new ones
    const { data: beforeBadges } = await supabase
      .from("user_badges").select("badge_id").eq("user_id", session.user.id);
    const beforeIds = new Set((beforeBadges || []).map(b => b.badge_id));

    await supabase.rpc("check_and_award_badges", { _user_id: session.user.id });

    const { data: afterBadges } = await supabase
      .from("user_badges").select("badge_id, badges(icon, name)").eq("user_id", session.user.id);
    const newBadges = (afterBadges || []).filter((b: any) => !beforeIds.has(b.badge_id));
    
    for (const nb of newBadges) {
      toast({ title: `${(nb as any).badges.icon} Badge unlocked!`, description: (nb as any).badges.name });
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getAvatarSrc = (prof: Profile) => {
    if (prof.use_avatar && prof.avatar_url) return prof.avatar_url;
    if (prof.profile_photo_url) return prof.profile_photo_url;
    return "";
  };

  const ChallengeCard = ({ challenge }: { challenge: Challenge }) => (
    <Card 
      className="cursor-pointer hover:shadow-elevated transition-all hover:scale-[1.02]"
      onClick={() => navigate(`/challenge/${challenge.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">{challenge.challenge_types.icon}</span>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate">{challenge.title}</CardTitle>
              <CardDescription className="line-clamp-2 text-sm">
                {challenge.description}
              </CardDescription>
            </div>
          </div>
          <Badge variant={challenge.status === "active" ? "default" : "secondary"} className="flex-shrink-0">
            {challenge.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={getAvatarSrc(challenge.profiles)} />
              <AvatarFallback>{challenge.profiles.display_name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground">{challenge.profiles.display_name}</span>
          </div>
          <span className="text-muted-foreground">
            Ends {format(new Date(challenge.end_date), "MMM d")}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading challenges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-gradient-primary border-b shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile && <BurgerMenu profile={profile} />}
            </div>
            <img src={logo} alt="Dare Me" className="h-14" />
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button onClick={() => navigate("/profile")} className="rounded-full hover:ring-2 hover:ring-white/50 transition-all">
                <Avatar className="h-9 w-9 border-2 border-white">
                  <AvatarImage src={getAvatarSrc(profile!)} />
                  <AvatarFallback>{profile?.display_name[0]}</AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        <div className="flex flex-col items-center gap-2">
          <Button 
            size="lg" 
            onClick={() => navigate("/create-challenge")}
            className="shadow-glow w-full max-w-sm text-base py-6"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create a new challenge
          </Button>
          <Button 
            variant="ghost"
            onClick={() => navigate("/explore")}
            className="text-muted-foreground"
          >
            <Compass className="h-4 w-4 mr-1" />
            Explore challenges
          </Button>
        </div>



        <section className="space-y-4">
          <h2 className="text-2xl font-bold">My challenges to complete</h2>
          {myChallenges.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No active challenges. Join or create one!
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {myChallenges.slice(0, myVisible).map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
          {myChallenges.length > myVisible && (
            <div className="flex justify-center">
              <Button variant="ghost" onClick={() => setMyVisible((v) => v + 5)} className="gap-1">
                <ChevronDown className="h-4 w-4" /> Show more ({myChallenges.length - myVisible} remaining)
              </Button>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Challenges I created</h2>
          {createdChallenges.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                You haven't created any challenges yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {createdChallenges.slice(0, createdVisible).map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
          {createdChallenges.length > createdVisible && (
            <div className="flex justify-center">
              <Button variant="ghost" onClick={() => setCreatedVisible((v) => v + 5)} className="gap-1">
                <ChevronDown className="h-4 w-4" /> Show more ({createdChallenges.length - createdVisible} remaining)
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;
