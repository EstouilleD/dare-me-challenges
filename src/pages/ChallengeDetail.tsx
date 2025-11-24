import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Users, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

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
  start_date: string;
  end_date: string;
  status: string;
  is_public: boolean;
  ask_numeric_score: boolean;
  owner_id: string;
  challenge_types: ChallengeType;
  profiles: Profile;
}

interface Participation {
  id: string;
  user_id: string;
  is_active: boolean;
  profiles: Profile;
}

interface Proof {
  id: string;
  image_url: string | null;
  video_url: string | null;
  text: string | null;
  quantity_value: number | null;
  created_at: string;
  participations: {
    profiles: Profile;
  };
}

const ChallengeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<Participation[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [myParticipation, setMyParticipation] = useState<Participation | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const [proofText, setProofText] = useState("");
  const [proofQuantity, setProofQuantity] = useState("");
  const [submittingProof, setSubmittingProof] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(session.user.id);

    // Load challenge
    const { data: challengeData } = await supabase
      .from("challenges")
      .select(`
        *,
        challenge_types(id, name, icon),
        profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)
      `)
      .eq("id", id)
      .single();

    if (!challengeData) {
      toast({
        variant: "destructive",
        title: "Challenge not found",
      });
      navigate("/");
      return;
    }

    setChallenge(challengeData as Challenge);

    // Load participants
    const { data: parts } = await supabase
      .from("participations")
      .select(`
        id,
        user_id,
        is_active,
        profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)
      `)
      .eq("challenge_id", id)
      .eq("is_active", true);

    setParticipants(parts as Participation[] || []);

    // Check if current user is participating
    const myPart = parts?.find(p => p.user_id === session.user.id);
    setMyParticipation(myPart || null);

    // Load proofs
    const { data: proofsData } = await supabase
      .from("proofs")
      .select(`
        *,
        participations!inner(
          profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)
        )
      `)
      .eq("challenge_id", id)
      .order("created_at", { ascending: false });

    setProofs(proofsData as Proof[] || []);

    setLoading(false);
  };

  const handleJoin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("participations")
      .insert({
        challenge_id: id,
        user_id: session.user.id,
        is_active: true,
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to join",
        description: error.message,
      });
    } else {
      toast({
        title: "Joined!",
        description: "You're now part of this challenge.",
      });
      loadData();
    }
  };

  const handleQuit = async () => {
    if (!myParticipation) return;

    const { error } = await supabase
      .from("participations")
      .update({ is_active: false })
      .eq("id", myParticipation.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to quit",
        description: error.message,
      });
    } else {
      toast({
        title: "Left challenge",
        description: "You've quit this challenge.",
      });
      loadData();
    }
  };

  const handleSubmitProof = async () => {
    if (!myParticipation) return;
    
    if (!proofText.trim() && !proofQuantity) {
      toast({
        variant: "destructive",
        title: "Missing proof",
        description: "Please provide proof details.",
      });
      return;
    }

    setSubmittingProof(true);

    const { error } = await supabase
      .from("proofs")
      .insert({
        participation_id: myParticipation.id,
        challenge_id: id,
        text: proofText.trim() || null,
        quantity_value: proofQuantity ? parseInt(proofQuantity) : null,
      });

    setSubmittingProof(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to submit",
        description: error.message,
      });
    } else {
      toast({
        title: "Proof submitted!",
        description: "Your proof has been added.",
      });
      setProofText("");
      setProofQuantity("");
      setDialogOpen(false);
      
      // Update is_done flag
      await supabase
        .from("participations")
        .update({ is_done: true })
        .eq("id", myParticipation.id);
      
      loadData();
    }
  };

  const getAvatarSrc = (prof: Profile) => {
    if (prof.use_avatar && prof.avatar_url) return prof.avatar_url;
    if (prof.profile_photo_url) return prof.profile_photo_url;
    return "";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading challenge...</p>
        </div>
      </div>
    );
  }

  if (!challenge) return null;

  const isOwner = currentUserId === challenge.owner_id;
  const isParticipant = !!myParticipation;
  const canJoin = !isParticipant && challenge.status === "active";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-gradient-primary border-b shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{challenge.title}</h1>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <span>{challenge.challenge_types.icon}</span>
                <span>{challenge.challenge_types.name}</span>
                {challenge.is_public && <Badge variant="secondary" className="text-xs">Public</Badge>}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <Card className="shadow-elevated">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Challenge Details</CardTitle>
                <CardDescription className="mt-2">{challenge.description}</CardDescription>
              </div>
              <Badge variant={challenge.status === "active" ? "default" : "secondary"}>
                {challenge.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Created by</p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getAvatarSrc(challenge.profiles)} />
                    <AvatarFallback>{challenge.profiles.display_name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{challenge.profiles.display_name}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium mt-1">
                  {format(new Date(challenge.start_date), "MMM d")} - {format(new Date(challenge.end_date), "MMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              <span>{participants.length} participant{participants.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <Avatar key={p.id} className="h-10 w-10">
                  <AvatarImage src={getAvatarSrc(p.profiles)} />
                  <AvatarFallback>{p.profiles.display_name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </CardContent>
        </Card>

        {canJoin && (
          <Card className="shadow-card border-primary">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Join this challenge</h3>
                  <p className="text-sm text-muted-foreground">Become a participant and submit proofs</p>
                </div>
                <Button onClick={handleJoin}>Join Challenge</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isParticipant && (
          <Card className="shadow-elevated border-accent">
            <CardHeader>
              <CardTitle>My Participation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">Submit Proof</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Submit Proof</DialogTitle>
                    <DialogDescription>
                      Prove you completed the challenge
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="proof-text">Description</Label>
                      <Textarea
                        id="proof-text"
                        placeholder="Describe what you did..."
                        value={proofText}
                        onChange={(e) => setProofText(e.target.value)}
                        rows={4}
                      />
                    </div>
                    {challenge.challenge_types.name !== "Creative" && (
                      <div className="space-y-2">
                        <Label htmlFor="proof-quantity">Quantity/Count</Label>
                        <Input
                          id="proof-quantity"
                          type="number"
                          placeholder="How many?"
                          value={proofQuantity}
                          onChange={(e) => setProofQuantity(e.target.value)}
                        />
                      </div>
                    )}
                    <Button onClick={handleSubmitProof} disabled={submittingProof} className="w-full">
                      {submittingProof ? "Submitting..." : "Submit Proof"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={handleQuit} className="w-full">
                Quit Challenge
              </Button>
            </CardContent>
          </Card>
        )}

        {challenge.status === "finished" && (
          <Card className="shadow-elevated border-success">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Ranking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Challenge completed! Check back for final rankings.</p>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Participants' Proofs</CardTitle>
            <CardDescription>{proofs.length} proof{proofs.length !== 1 ? "s" : ""} submitted</CardDescription>
          </CardHeader>
          <CardContent>
            {proofs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No proofs submitted yet.</p>
            ) : (
              <div className="space-y-4">
                {proofs.map((proof) => (
                  <Card 
                    key={proof.id} 
                    className="cursor-pointer hover:shadow-elevated transition-all"
                    onClick={() => navigate(`/proof/${proof.id}`)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getAvatarSrc(proof.participations.profiles)} />
                          <AvatarFallback>{proof.participations.profiles.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{proof.participations.profiles.display_name}</p>
                          {proof.text && <p className="text-sm text-muted-foreground line-clamp-2">{proof.text}</p>}
                          {proof.quantity_value && (
                            <p className="text-sm text-muted-foreground">Quantity: {proof.quantity_value}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(proof.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ChallengeDetail;
