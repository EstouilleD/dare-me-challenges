import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PartyPopper, X, Lock, Crown } from "lucide-react";
import logo from "@/assets/logo.png";
import { checkParticipationLimit } from "@/hooks/usePremium";

const JoinChallenge = () => {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [challenge, setChallenge] = useState<any>(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [joined, setJoined] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoad();
  }, [challengeId]);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Store the join URL and redirect to auth
      localStorage.setItem("pendingJoin", `/join/${challengeId}`);
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);

    // Load challenge info
    const { data: challengeData } = await supabase
      .from("challenges")
      .select(`
        id, title, description, status,
        challenge_types(icon, name),
        profiles(display_name)
      `)
      .eq("id", challengeId)
      .single();

    if (!challengeData) {
      toast({ variant: "destructive", title: "Challenge not found" });
      navigate("/");
      return;
    }

    setChallenge(challengeData);

    // Check if already a participant
    const { data: existing } = await supabase
      .from("participations")
      .select("id, is_active")
      .eq("challenge_id", challengeId)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (existing?.is_active) {
      setAlreadyJoined(true);
    }

    setLoading(false);
  };

  const handleJoin = async () => {
    if (!userId || !challengeId) return;
    setJoining(true);

    // Check participation limit
    const limitResult = await checkParticipationLimit(userId);
    if (!limitResult.allowed) {
      toast({ 
        variant: "destructive", 
        title: "Participation limit reached", 
        description: `You're in ${limitResult.count}/${limitResult.limit} active challenges. Visit the Store to upgrade to Premium for unlimited.` 
      });
      setJoining(false);
      return;
    }

    // Upsert participation
    const { data: existing } = await supabase
      .from("participations")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("user_id", userId)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("participations")
        .update({ is_active: true })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase
        .from("participations")
        .insert({ challenge_id: challengeId, user_id: userId, is_active: true }));
    }

    if (error) {
      toast({ variant: "destructive", title: "Failed to join", description: error.message });
      setJoining(false);
      return;
    }

    // Accept any pending invitation
    await supabase
      .from("invitations")
      .update({ status: "accepted" })
      .eq("challenge_id", challengeId)
      .eq("recipient_user_id", userId)
      .eq("status", "pending");

    setJoined(true);
    setJoining(false);
  };

  const handleDecline = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Success state
  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm shadow-elevated text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-bold">You have been added to this challenge!</h2>
            <p className="text-muted-foreground text-sm">{challenge?.title}</p>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => navigate(`/challenge/${challengeId}`)} className="w-full gap-2">
                <PartyPopper className="h-4 w-4" />
                Let's go!
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already joined
  if (alreadyJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm shadow-elevated text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <div className="text-5xl">✅</div>
            <h2 className="text-xl font-bold">You're already in!</h2>
            <p className="text-muted-foreground text-sm">You're already a participant in this challenge.</p>
            <Button onClick={() => navigate(`/challenge/${challengeId}`)} className="w-full">
              Go to Challenge
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Confirmation prompt
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-elevated">
        <CardHeader className="text-center pb-2">
          <img src={logo} alt="Dare Me" className="h-8 mx-auto mb-2" />
          <CardTitle className="text-lg">Join Challenge?</CardTitle>
          <CardDescription>You've been invited to join:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <span className="text-3xl block mb-2">{challenge?.challenge_types?.icon}</span>
            <h3 className="font-semibold text-lg">{challenge?.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{challenge?.description}</p>
            <p className="text-xs text-muted-foreground mt-2">by {challenge?.profiles?.display_name}</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={handleDecline}
            >
              <X className="h-4 w-4" />
              Nope!
            </Button>
            <Button
              className="flex-1 gap-1.5"
              onClick={handleJoin}
              disabled={joining || challenge?.status !== "active"}
            >
              {joining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PartyPopper className="h-4 w-4" />
              )}
              Let's go!
            </Button>
          </div>

          {challenge?.status !== "active" && (
            <p className="text-xs text-destructive text-center">This challenge is no longer active.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinChallenge;
