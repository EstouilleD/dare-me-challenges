import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Search, Users, Globe, Lock, BadgeCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import HeaderLogo from "@/components/HeaderLogo";
import BurgerMenu from "@/components/BurgerMenu";
import { getAvatarSrc } from "@/lib/avatars";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  use_avatar: boolean;
}

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  category: string;
  logo_url: string | null;
  is_verified: boolean;
  member_count: number;
}

const TYPE_ICON: Record<string, typeof Globe> = { public: Globe, private: Lock, brand: BadgeCheck };

const Communities = () => {
  const navigate = useNavigate();
  const { headerClass } = useAutoHideHeader();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [exploreCommunities, setExploreCommunities] = useState<Community[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: p } = await supabase.from("profiles").select("id, display_name, avatar_url, profile_photo_url, use_avatar").eq("id", session.user.id).single();
    setProfile(p);

    // My communities
    const { data: memberships } = await supabase
      .from("community_members").select("community_id").eq("user_id", session.user.id);
    const myIds = (memberships || []).map((m: any) => m.community_id);

    if (myIds.length > 0) {
      const { data } = await supabase.from("communities").select("id, name, slug, description, type, category, logo_url, is_verified, member_count").in("id", myIds);
      setMyCommunities(data || []);
    }

    // Explore: public + brand communities
    const { data: explore } = await supabase
      .from("communities").select("id, name, slug, description, type, category, logo_url, is_verified, member_count")
      .in("type", ["public", "brand"]).order("member_count", { ascending: false }).limit(50);
    setExploreCommunities((explore || []).filter((c: any) => !myIds.includes(c.id)));

    setLoading(false);
  };

  const filtered = (list: Community[]) =>
    search ? list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())) : list;

  const CommunityCard = ({ community }: { community: Community }) => {
    const Icon = TYPE_ICON[community.type] || Globe;
    return (
      <Card className="shadow-card cursor-pointer hover:shadow-elevated transition-shadow" onClick={() => navigate(`/community/${community.slug}`)}>
        <CardContent className="p-4 flex items-center gap-3">
          {community.logo_url ? (
            <img src={community.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">{community.name[0]}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm truncate">{community.name}</p>
              {community.is_verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">{community.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">
                <Icon className="h-2.5 w-2.5 mr-0.5" />{community.type}
              </Badge>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" />{community.member_count}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 relative">
            {profile && <BurgerMenu profile={profile} />}
            <h1 className="text-xl font-bold text-white">Communities</h1>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/create-community")} className="text-white hover:bg-white/20">
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            <HeaderLogo />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-4 pb-12">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search communities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="my" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my">My Communities</TabsTrigger>
            <TabsTrigger value="explore">Explore</TabsTrigger>
          </TabsList>

          <TabsContent value="my">
            {filtered(myCommunities).length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-semibold text-lg">No communities yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create or join a community to get started!</p>
                  <Button className="mt-4 bg-gradient-primary" onClick={() => navigate("/create-community")}>
                    Create Community
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered(myCommunities).map((c) => <CommunityCard key={c.id} community={c} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="explore">
            {filtered(exploreCommunities).length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-semibold">No communities to explore</p>
                  <p className="text-sm text-muted-foreground mt-1">Be the first to create one!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered(exploreCommunities).map((c) => <CommunityCard key={c.id} community={c} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Communities;
