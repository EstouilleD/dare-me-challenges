import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getAvatarSrc } from "@/lib/avatars";
import {
  ArrowLeft, Users, Trophy, MessageSquare, Swords, Settings,
  BadgeCheck, Globe, Lock, LogIn, LogOut, Send, Crown, Shield, ShieldCheck,
} from "lucide-react";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import HeaderLogo from "@/components/HeaderLogo";
import { format } from "date-fns";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  category: string;
  logo_url: string | null;
  banner_url: string | null;
  accent_color: string;
  is_verified: boolean;
  member_count: number;
  owner_id: string;
  rules: string | null;
  requires_approval: boolean;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: { id: string; display_name: string; avatar_url: string | null; profile_photo_url: string | null; use_avatar: boolean };
}

interface Post {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  profiles: { id: string; display_name: string; avatar_url: string | null; profile_photo_url: string | null; use_avatar: boolean };
}

interface ChallengeItem {
  id: string;
  title: string;
  status: string;
  end_date: string;
  challenge_types: { icon: string; name: string };
}

const ROLE_ICONS: Record<string, typeof Crown> = { owner: Crown, admin: ShieldCheck, moderator: Shield };

const CommunityDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { headerClass } = useAutoHideHeader();
  const { toast } = useToast();

  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => { loadCommunity(); }, [slug]);

  const loadCommunity = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    setUserId(session.user.id);

    const { data: c } = await supabase.from("communities").select("*").eq("slug", slug).single();
    if (!c) { navigate("/communities"); return; }
    setCommunity(c);

    // Check membership
    const { data: membership } = await supabase
      .from("community_members").select("role")
      .eq("community_id", c.id).eq("user_id", session.user.id).maybeSingle();
    setMyRole(membership?.role || null);

    // Load members with profiles
    const { data: mems } = await supabase
      .from("community_members").select("id, user_id, role, joined_at, profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)")
      .eq("community_id", c.id).order("joined_at", { ascending: true });
    setMembers((mems as any) || []);

    // Load posts
    if (membership) {
      const { data: p } = await supabase
        .from("community_posts").select("id, text, created_at, user_id, profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)")
        .eq("community_id", c.id).order("created_at", { ascending: false }).limit(50);
      setPosts((p as any) || []);
    }

    // Load community challenges
    const { data: ch } = await supabase
      .from("challenges").select("id, title, status, end_date, challenge_types(icon, name)")
      .eq("community_id", c.id).order("created_at", { ascending: false });
    setChallenges((ch as any) || []);

    setLoading(false);
  };

  const handleJoin = async () => {
    if (!community || !userId) return;
    setJoining(true);
    const { error } = await supabase.from("community_members").insert({
      community_id: community.id, user_id: userId, role: "member",
    });
    if (error) {
      toast({ variant: "destructive", title: "Could not join", description: error.message });
    } else {
      toast({ title: "Welcome! 🎉", description: `You joined ${community.name}` });
      loadCommunity();
    }
    setJoining(false);
  };

  const handleLeave = async () => {
    if (!community || !userId) return;
    const { error } = await supabase.from("community_members").delete()
      .eq("community_id", community.id).eq("user_id", userId);
    if (!error) {
      toast({ title: "You left the community" });
      setMyRole(null);
      loadCommunity();
    }
  };

  const handlePost = async () => {
    if (!postText.trim() || !community || !userId) return;
    setPosting(true);
    const { error } = await supabase.from("community_posts").insert({
      community_id: community.id, user_id: userId, text: postText.trim(),
    });
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else { setPostText(""); loadCommunity(); }
    setPosting(false);
  };

  if (loading || !community) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  const isMember = !!myRole;
  const isAdmin = myRole === "owner" || myRole === "admin";
  const canJoin = !isMember && (community.type === "public" || community.type === "brand");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 relative">
            <Button variant="ghost" size="icon" onClick={() => navigate("/communities")} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-white truncate flex-1">{community.name}</h1>
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => navigate(`/community/${slug}/settings`)} className="text-white hover:bg-white/20">
                <Settings className="h-5 w-5" />
              </Button>
            )}
            <HeaderLogo />
          </div>
        </div>
      </header>

      {/* Banner + Logo */}
      <div className="relative">
        {community.banner_url ? (
          <img src={community.banner_url} alt="" className="w-full h-36 object-cover" />
        ) : (
          <div className="w-full h-36 bg-gradient-to-r from-primary/20 to-accent/20" />
        )}
        <div className="absolute -bottom-10 left-4">
          {community.logo_url ? (
            <img src={community.logo_url} alt="" className="h-20 w-20 rounded-2xl border-4 border-background object-cover shadow-elevated" />
          ) : (
            <div className="h-20 w-20 rounded-2xl border-4 border-background bg-primary/10 flex items-center justify-center shadow-elevated">
              <span className="text-2xl font-bold text-primary">{community.name[0]}</span>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="container mx-auto px-4 pt-14 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold">{community.name}</h2>
          {community.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
          <Badge variant="outline" className="text-xs capitalize">
            {community.type === "public" && <Globe className="h-3 w-3 mr-1" />}
            {community.type === "private" && <Lock className="h-3 w-3 mr-1" />}
            {community.type}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{community.description}</p>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> {community.member_count} member{community.member_count !== 1 && "s"}
        </p>

        {/* Action */}
        <div className="mt-4 flex gap-2">
          {canJoin && (
            <Button onClick={handleJoin} disabled={joining} className="bg-gradient-primary">
              <LogIn className="h-4 w-4 mr-2" /> {joining ? "Joining..." : "Join Community"}
            </Button>
          )}
          {isMember && myRole !== "owner" && (
            <Button variant="outline" size="sm" onClick={handleLeave}>
              <LogOut className="h-4 w-4 mr-2" /> Leave
            </Button>
          )}
          {isMember && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/create-challenge?community=${community.id}`)}>
              <Swords className="h-4 w-4 mr-2" /> New Challenge
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <main className="container mx-auto px-4 pb-12">
        <Tabs defaultValue="challenges" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="challenges" className="text-xs"><Swords className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Challenges</span></TabsTrigger>
            <TabsTrigger value="feed" className="text-xs"><MessageSquare className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Feed</span></TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs"><Trophy className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Ranking</span></TabsTrigger>
            <TabsTrigger value="members" className="text-xs"><Users className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Members</span></TabsTrigger>
          </TabsList>

          {/* Challenges Tab */}
          <TabsContent value="challenges">
            {challenges.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <Swords className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-semibold text-lg">No challenges yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Be the first to create a challenge in this community!</p>
                  {isMember && (
                    <Button className="mt-4 bg-gradient-primary" onClick={() => navigate(`/create-challenge?community=${community.id}`)}>
                      Create First Challenge
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {challenges.map((ch) => (
                  <Card key={ch.id} className="shadow-card cursor-pointer hover:shadow-elevated transition-shadow" onClick={() => navigate(`/challenge/${ch.id}`)}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <span className="text-2xl">{ch.challenge_types?.icon || "🏆"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{ch.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{ch.status}</p>
                      </div>
                      <Badge variant={ch.status === "active" ? "default" : "secondary"} className="text-xs">{ch.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Feed Tab */}
          <TabsContent value="feed">
            {!isMember ? (
              <Card className="shadow-card"><CardContent className="py-12 text-center">
                <Lock className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Join to see the community feed</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-4">
                {/* Post composer */}
                <Card className="shadow-card">
                  <CardContent className="p-3 flex gap-2 items-end">
                    <Textarea
                      placeholder="Share something with the community..."
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      rows={2}
                      maxLength={500}
                      className="resize-none"
                    />
                    <Button size="icon" onClick={handlePost} disabled={posting || !postText.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                {posts.length === 0 ? (
                  <Card className="shadow-card"><CardContent className="py-12 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="font-semibold">No posts yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Start the conversation!</p>
                  </CardContent></Card>
                ) : (
                  posts.map((post) => (
                    <Card key={post.id} className="shadow-card">
                      <CardContent className="p-4 flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={getAvatarSrc(post.profiles)} />
                          <AvatarFallback>{post.profiles.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{post.profiles.display_name}</p>
                            <span className="text-xs text-muted-foreground">{format(new Date(post.created_at), "MMM d")}</span>
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{post.text}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card className="shadow-card"><CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-semibold">Community Leaderboard</p>
              <p className="text-sm text-muted-foreground mt-1">Rankings will appear once challenges are completed</p>
            </CardContent></Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            {members.length === 0 ? (
              <Card className="shadow-card"><CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-semibold">No members yet</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {members.map((m) => {
                  const RoleIcon = ROLE_ICONS[m.role];
                  return (
                    <Card key={m.id} className="shadow-card">
                      <CardContent className="p-3 flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={getAvatarSrc(m.profiles)} />
                          <AvatarFallback>{m.profiles.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.profiles.display_name}</p>
                          <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                            {RoleIcon && <RoleIcon className="h-3 w-3" />} {m.role}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CommunityDetail;
