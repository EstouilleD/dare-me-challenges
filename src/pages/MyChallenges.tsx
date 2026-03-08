import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";

const MyChallenges = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { data } = await supabase
        .from("participations")
        .select(`
          challenge_id,
          challenges!inner(
            id, title, description, end_date, status, is_public,
            challenge_types(id, name, icon),
            profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)
          )
        `)
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .eq("challenges.status", "active");

      setChallenges(data?.map(p => p.challenges).filter(Boolean) || []);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const getAvatarSrc = (p: any) => {
    if (p.use_avatar && p.avatar_url) return p.avatar_url;
    if (p.profile_photo_url) return p.profile_photo_url;
    return "";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white hover:bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">My Challenges</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : challenges.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No active challenges.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {challenges.map((c: any) => (
              <Card key={c.id} className="cursor-pointer hover:shadow-elevated transition-all hover:scale-[1.02]" onClick={() => navigate(`/challenge/${c.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-2xl flex-shrink-0">{c.challenge_types?.icon}</span>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{c.title}</CardTitle>
                        <CardDescription className="line-clamp-2 text-sm">{c.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="default" className="flex-shrink-0">{c.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={getAvatarSrc(c.profiles)} />
                        <AvatarFallback>{c.profiles?.display_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">{c.profiles?.display_name}</span>
                    </div>
                    <span className="text-muted-foreground">Ends {format(new Date(c.end_date), "MMM d")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyChallenges;
