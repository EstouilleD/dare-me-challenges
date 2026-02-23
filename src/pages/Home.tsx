import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, LogOut, Compass } from "lucide-react";
import logo from "@/assets/logo.png";

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
  const [publicChallenges, setPublicChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

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

    // Load public challenges (not participating)
    const { data: publicChalls } = await supabase
      .from("challenges")
      .select(`
        *,
        challenge_types(id, name, icon),
        profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)
      `)
      .eq("is_public", true)
      .neq("owner_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Filter out challenges user is already participating in
    const participatingIds = new Set(myActiveChallenges.map(c => c.id));
    const filteredPublic = (publicChalls || []).filter(c => !participatingIds.has(c.id));
    setPublicChallenges(filteredPublic as Challenge[]);

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
            <div>
              <img src={logo} alt="Dare Me" className="h-10" />
              <p className="text-sm text-white/80">Hi, {profile?.display_name}! 👋</p>
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10 border-2 border-white">
                <AvatarImage src={getAvatarSrc(profile!)} />
                <AvatarFallback>{profile?.display_name[0]}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-white/20">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        <div className="flex justify-center">
          <Button 
            size="lg" 
            onClick={() => navigate("/create-challenge")}
            className="shadow-glow"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create a new challenge
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
              {myChallenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
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
              {createdChallenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Public challenges</h2>
          {publicChallenges.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No public challenges available at the moment.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {publicChallenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;
