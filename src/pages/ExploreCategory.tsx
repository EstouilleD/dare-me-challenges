import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users } from "lucide-react";
import { format } from "date-fns";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import HeaderLogo from "@/components/HeaderLogo";
import { getAvatarSrc } from "@/lib/avatars";

const ExploreCategory = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { headerClass } = useAutoHideHeader();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategory();
  }, [slug]);

  const loadCategory = async () => {
    const { data: cat } = await supabase.from("categories").select("*").eq("slug", slug).single();
    if (!cat) { navigate("/explore"); return; }
    setCategoryName(cat.name);
    setCategoryIcon(cat.icon);

    const { data } = await supabase
      .from("challenges")
      .select(`*, challenge_types(id, name, icon), profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)`)
      .eq("category_id", cat.id)
      .eq("is_public", true)
      .in("status", ["active", "upcoming"])
      .order("created_at", { ascending: false })
      .limit(50);

    setChallenges(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 relative">
            <Button variant="ghost" size="icon" onClick={() => navigate("/explore")} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-white">{categoryIcon} {categoryName}</h1>
            <HeaderLogo />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-lg space-y-3 pb-12">
        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading...</p>
        ) : challenges.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No challenges in this category yet.
            </CardContent>
          </Card>
        ) : (
          challenges.map((ch: any) => (
            <Card key={ch.id} className="cursor-pointer hover:shadow-elevated transition-all" onClick={() => navigate(`/challenge/${ch.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-2xl">{ch.challenge_types?.icon}</span>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">{ch.title}</CardTitle>
                      <CardDescription className="line-clamp-2 text-sm">{ch.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={ch.status === "active" ? "default" : "secondary"}>{ch.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={getAvatarSrc(ch.profiles)} />
                      <AvatarFallback>{ch.profiles?.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground">{ch.profiles?.display_name}</span>
                  </div>
                  <span className="text-muted-foreground">Ends {format(new Date(ch.end_date), "MMM d")}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default ExploreCategory;
