import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, BadgeCheck } from "lucide-react";

const CommunityJoin = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [community, setCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadInvite();
  }, [code]);

  const loadInvite = async () => {
    if (!code) { navigate("/"); return; }

    const { data: link } = await supabase
      .from("community_invite_links")
      .select("*, communities(id, name, slug, description, type, logo_url, is_verified, member_count)")
      .eq("code", code)
      .eq("is_active", true)
      .single();

    if (!link) {
      toast({ variant: "destructive", title: "Invalid or expired invite link" });
      navigate("/");
      return;
    }

    setCommunity(link.communities);
    setLoading(false);
  };

  const handleJoin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate(`/auth?redirect=/community/join/${code}`);
      return;
    }

    setJoining(true);

    // Check if already a member
    const { data: existing } = await supabase
      .from("community_members")
      .select("id")
      .eq("community_id", community.id)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (existing) {
      navigate(`/community/${community.slug}`);
      return;
    }

    const { error } = await supabase.from("community_members").insert({
      community_id: community.id,
      user_id: session.user.id,
    });

    if (error) {
      toast({ variant: "destructive", title: "Could not join", description: error.message });
    } else {
      // Increment uses on the invite link
      await supabase.from("community_invite_links").update({
        uses: (await supabase.from("community_invite_links").select("uses").eq("code", code).single()).data?.uses + 1
      }).eq("code", code);

      toast({ title: "Welcome! 🎉", description: `You joined ${community.name}` });
      navigate(`/community/${community.slug}`);
    }
    setJoining(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-elevated">
        <CardContent className="p-6 text-center space-y-4">
          {community.logo_url ? (
            <img src={community.logo_url} alt="" className="h-20 w-20 rounded-2xl object-cover mx-auto" />
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-3xl font-bold text-primary">{community.name[0]}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-xl font-bold">{community.name}</h1>
              {community.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{community.description}</p>
          </div>

          <div className="flex items-center justify-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm">{community.member_count} members</span>
          </div>

          <p className="text-sm">You've been invited to join this community!</p>

          <Button onClick={handleJoin} disabled={joining} className="w-full" size="lg">
            {joining ? "Joining..." : "Join Community 🚀"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommunityJoin;
