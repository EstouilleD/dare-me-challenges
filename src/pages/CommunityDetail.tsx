import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getAvatarSrc } from "@/lib/avatars";
import {
  ArrowLeft, Users, Trophy, MessageSquare, Swords, Settings, Share2, Info,
  BadgeCheck, Globe, Lock, LogIn, LogOut, Send, Crown, Shield, ShieldCheck,
  ExternalLink, Star, Trash2, UserMinus, ChevronUp,
} from "lucide-react";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import HeaderLogo from "@/components/HeaderLogo";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import CommunityLeaderboard from "@/components/CommunityLeaderboard";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  website_url: string | null;
  is_verified: boolean;
  member_count: number;
  owner_id: string;
  rules: string | null;
  requires_approval: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  use_avatar: boolean;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: Profile;
}

interface Post {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  profiles: Profile;
}

interface ChallengeItem {
  id: string;
  title: string;
  status: string;
  end_date: string;
  is_public: boolean;
  challenge_types: { icon: string; name: string };
  participations: { id: string }[];
}

const ROLE_ICONS: Record<string, typeof Crown> = { owner: Crown, admin: ShieldCheck, moderator: Shield };
const ROLE_ORDER = ["owner", "admin", "moderator", "member"];

const CATEGORY_LABELS: Record<string, string> = {
  sports: "🏃 Sports & Fitness", cooking: "🍳 Cooking & Food", wellness: "🧘 Wellness & Health",
  productivity: "📈 Productivity", family: "👨‍👩‍👧 Family & Friends", education: "📚 Education",
  creative: "🎨 Creative & Arts", gaming: "🎮 Gaming", music: "🎵 Music", travel: "✈️ Travel", general: "🌟 General",
};

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

    const { data: membership } = await supabase
      .from("community_members").select("role")
      .eq("community_id", c.id).eq("user_id", session.user.id).maybeSingle();
    setMyRole(membership?.role || null);

    const { data: mems } = await supabase
      .from("community_members").select("id, user_id, role, joined_at, profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)")
      .eq("community_id", c.id).order("joined_at", { ascending: true });
    setMembers((mems as any) || []);

    if (membership) {
      const { data: p } = await supabase
        .from("community_posts").select("id, text, created_at, user_id, profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)")
        .eq("community_id", c.id).order("created_at", { ascending: false }).limit(50);
      setPosts((p as any) || []);
    }

    const { data: ch } = await supabase
      .from("challenges").select("id, title, status, end_date, is_public, challenge_types(icon, name), participations(id)")
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

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: community?.name, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    }
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from("community_posts").delete().eq("id", postId);
    if (!error) loadCommunity();
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase.from("community_members").delete().eq("id", memberId);
    if (!error) { toast({ title: "Member removed" }); loadCommunity(); }
  };

  const handlePromote = async (memberId: string, newRole: string) => {
    const { error } = await supabase.from("community_members").update({ role: newRole as any }).eq("id", memberId);
    if (!error) { toast({ title: `Role updated to ${newRole}` }); loadCommunity(); }
  };

  if (loading || !community) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  const isMember = !!myRole;
  const isAdmin = myRole === "owner" || myRole === "admin";
  const isModerator = isAdmin || myRole === "moderator";
  const isBrand = community.type === "brand";
  const canJoin = !isMember && (community.type === "public" || community.type === "brand");

  const featuredChallenge = challenges.find((c) => c.status === "active");
  const sortedMembers = [...members].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 relative">
            <Button variant="ghost" size="icon" onClick={() => navigate("/communities")} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-white truncate flex-1">{community.name}</h1>
            <Button variant="ghost" size="icon" onClick={handleShare} className="text-white hover:bg-white/20">
              <Share2 className="h-5 w-5" />
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => navigate(`/community/${slug}/settings`)} className="text-white hover:bg-white/20">
                <Settings className="h-5 w-5" />
              </Button>
            )}
            <HeaderLogo />
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="relative">
        {community.banner_url ? (
          <img src={community.banner_url} alt="" className="w-full h-40 object-cover" />
        ) : (
          <div
            className="w-full h-40"
            style={{
              background: isBrand && community.accent_color
                ? `linear-gradient(135deg, ${community.accent_color}, ${community.accent_color}88)`
                : undefined,
            }}
          >
            {!isBrand && <div className="w-full h-full bg-gradient-to-r from-primary/20 to-accent/20" />}
          </div>
        )}
        {/* Brand sponsor strip */}
        {isBrand && community.website_url && (
          <a
            href={community.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-0 inset-x-0 bg-black/50 backdrop-blur-sm text-white text-xs py-1.5 px-4 flex items-center justify-center gap-1.5 hover:bg-black/60 transition-colors"
          >
            Visit {community.name} <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {/* Logo */}
        <div className="absolute -bottom-12 left-4">
          {community.logo_url ? (
            <img
              src={community.logo_url}
              alt=""
              className={`h-24 w-24 rounded-2xl border-4 border-background object-cover shadow-elevated ${isBrand ? "ring-2 ring-yellow-400" : ""}`}
            />
          ) : (
            <div className={`h-24 w-24 rounded-2xl border-4 border-background bg-primary/10 flex items-center justify-center shadow-elevated ${isBrand ? "ring-2 ring-yellow-400" : ""}`}>
              <span className="text-3xl font-bold text-primary">{community.name[0]}</span>
            </div>
          )}
        </div>
      </div>

      {/* Info section */}
      <div className="container mx-auto px-4 pt-16 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold">{community.name}</h2>
              {community.is_verified && (
                <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <Badge variant="outline" className="text-xs capitalize">
                {community.type === "public" && <Globe className="h-3 w-3 mr-1" />}
                {community.type === "private" && <Lock className="h-3 w-3 mr-1" />}
                {community.type === "brand" && <BadgeCheck className="h-3 w-3 mr-1" />}
                {community.type}
              </Badge>
              <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[community.category] || community.category}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{community.description}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-4">
          <div className="text-center">
            <p className="text-lg font-bold">{community.member_count}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Members</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{challenges.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Challenges</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{challenges.filter((c) => c.status === "active").length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Active</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {canJoin && (
            <Button onClick={handleJoin} disabled={joining} className="bg-gradient-primary flex-1 sm:flex-none">
              <LogIn className="h-4 w-4 mr-2" /> {joining ? "Joining..." : "Join Community"}
            </Button>
          )}
          {isMember && (
            <>
              <Badge variant="secondary" className="px-3 py-1.5 text-sm">
                {myRole === "owner" && <Crown className="h-3.5 w-3.5 mr-1 text-yellow-500" />}
                {myRole === "admin" && <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
                {myRole === "moderator" && <Shield className="h-3.5 w-3.5 mr-1" />}
                ✓ {myRole === "member" ? "Joined" : myRole}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => navigate(`/create-challenge?community=${community.id}`)}>
                <Swords className="h-4 w-4 mr-1" /> New Challenge
              </Button>
              {myRole !== "owner" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground"><LogOut className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Leave community?</AlertDialogTitle>
                      <AlertDialogDescription>You can rejoin anytime if it's a public community.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLeave}>Leave</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
          {!isMember && community.type === "private" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" /> This community is invite-only
            </div>
          )}
        </div>
      </div>

      {/* Brand featured challenge */}
      {isBrand && featuredChallenge && (
        <div className="container mx-auto px-4 pb-4">
          <Card
            className="shadow-elevated border-yellow-400/30 bg-gradient-to-r from-yellow-50/50 to-orange-50/50 dark:from-yellow-950/20 dark:to-orange-950/20 cursor-pointer hover:shadow-glow transition-shadow"
            onClick={() => navigate(`/challenge/${featuredChallenge.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-yellow-600 dark:text-yellow-400">Featured Challenge</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{featuredChallenge.challenge_types?.icon || "🏆"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{featuredChallenge.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {featuredChallenge.participations?.length || 0} participants · Ends {format(new Date(featuredChallenge.end_date), "MMM d")}
                  </p>
                </div>
                <Badge className="bg-primary">{featuredChallenge.status}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator className="mx-4" />

      {/* Tabs */}
      <main className="container mx-auto px-4 py-4 pb-12">
        <Tabs defaultValue="about" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="about" className="text-xs"><Info className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">About</span></TabsTrigger>
            <TabsTrigger value="challenges" className="text-xs"><Swords className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Challenges</span></TabsTrigger>
            <TabsTrigger value="feed" className="text-xs"><MessageSquare className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Feed</span></TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs"><Trophy className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Ranking</span></TabsTrigger>
            <TabsTrigger value="members" className="text-xs"><Users className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Members</span></TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-4">
            <Card className="shadow-card">
              <CardContent className="p-4 space-y-4">
                <div>
                  <h3 className="font-semibold text-sm mb-1">About</h3>
                  <p className="text-sm text-muted-foreground">{community.description}</p>
                </div>
                {community.rules && (
                  <div>
                    <h3 className="font-semibold text-sm mb-1">📋 Community Rules</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{community.rules}</p>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Category</p>
                    <p className="font-medium">{CATEGORY_LABELS[community.category] || community.category}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Created</p>
                    <p className="font-medium">{format(new Date(community.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Visibility</p>
                    <p className="font-medium capitalize">{community.type}</p>
                  </div>
                  {community.website_url && (
                    <div>
                      <p className="text-muted-foreground text-xs">Website</p>
                      <a href={community.website_url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary flex items-center gap-1 hover:underline">
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                        <p className="text-xs text-muted-foreground">
                          {ch.participations?.length || 0} participants · {ch.status === "active" ? `Ends ${format(new Date(ch.end_date), "MMM d")}` : ch.status}
                        </p>
                      </div>
                      <Badge variant={ch.status === "active" ? "default" : "secondary"} className="text-xs capitalize">{ch.status}</Badge>
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
                            <span className="text-xs text-muted-foreground">{format(new Date(post.created_at), "MMM d 'at' h:mm a")}</span>
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{post.text}</p>
                        </div>
                        {(post.user_id === userId || isModerator) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete post?</AlertDialogTitle></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePost(post.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <CommunityLeaderboard communityId={community.id} currentUserId={userId} />
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
                {sortedMembers.map((m) => {
                  const RoleIcon = ROLE_ICONS[m.role];
                  const canManage = isAdmin && m.user_id !== userId && m.role !== "owner";
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
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><Settings className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {m.role === "member" && (
                                <DropdownMenuItem onClick={() => handlePromote(m.id, "moderator")}>
                                  <ChevronUp className="h-4 w-4 mr-2" /> Promote to Moderator
                                </DropdownMenuItem>
                              )}
                              {(m.role === "member" || m.role === "moderator") && myRole === "owner" && (
                                <DropdownMenuItem onClick={() => handlePromote(m.id, "admin")}>
                                  <ChevronUp className="h-4 w-4 mr-2" /> Promote to Admin
                                </DropdownMenuItem>
                              )}
                              {m.role !== "member" && (
                                <DropdownMenuItem onClick={() => handlePromote(m.id, "member")}>
                                  Demote to Member
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleRemoveMember(m.id)} className="text-destructive">
                                <UserMinus className="h-4 w-4 mr-2" /> Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
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
