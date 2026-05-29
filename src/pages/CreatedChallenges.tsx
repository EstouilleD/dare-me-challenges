import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft, Plus } from "lucide-react";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import HeaderLogo from "@/components/HeaderLogo";
import { usePagination } from "@/hooks/usePagination";
import ShowMoreButton from "@/components/ShowMoreButton";

const CreatedChallenges = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { headerClass } = useAutoHideHeader();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { visibleItems, hasMore, showMore, totalCount, visibleCount } = usePagination(challenges);

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
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white hover:bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-white truncate flex-1">{t("createdChallenges.title")}</h1>
          <Button size="sm" onClick={() => navigate("/create-challenge")} className="bg-white/20 hover:bg-white/30 text-white border-0 gap-1 flex-shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("home.createChallenge")}</span>
          </Button>
          <HeaderLogo />
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">{t("home.loadingChallenges")}</p>
        ) : challenges.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <p className="text-muted-foreground">{t("home.noCreatedChallenges")}</p>
              <Button onClick={() => navigate("/create-challenge")} className="gap-2">
                <Plus className="h-4 w-4" />
                {t("home.createChallenge")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {visibleItems.map((c: any) => (
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
                    <span>{t("common.ends")} {format(new Date(c.end_date), "MMM d")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {hasMore && <ShowMoreButton onClick={showMore} visibleCount={visibleCount} totalCount={totalCount} />}
          </div>
        )}
      </main>
    </div>
  );
};

export default CreatedChallenges;
