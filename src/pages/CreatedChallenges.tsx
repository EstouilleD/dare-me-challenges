import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";

const CreatedChallenges = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { data } = await supabase
        .from("challenges")
        .select(`*, challenge_types(id, name, icon)`)
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      setChallenges(data || []);
      setLoading(false);
    };
    load();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white hover:bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Challenges Created</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : challenges.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">You haven't created any challenges yet.</CardContent></Card>
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
                    <Badge variant={c.status === "active" ? "default" : "secondary"} className="flex-shrink-0">{c.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{c.is_public ? "🌍 Public" : "🔒 Private"}</span>
                    <span>Ends {format(new Date(c.end_date), "MMM d")}</span>
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

export default CreatedChallenges;
