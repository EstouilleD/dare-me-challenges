import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";
import { ArrowLeft, Users, Trophy, Pencil, Trash2, UserMinus, Clock, UserPlus } from "lucide-react";
import InviteParticipants from "@/components/InviteParticipants";
import ChallengeProgress from "@/components/ChallengeProgress";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

const useCountdown = (endDate: string) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    const end = new Date(endDate);
    if (now >= end) return "Ended";
    const days = differenceInDays(end, now);
    if (days >= 1) return `${days}D left`;
    const hours = differenceInHours(end, now);
    if (hours >= 1) return `${hours}H left`;
    const mins = differenceInMinutes(end, now);
    if (mins >= 1) return `${mins}min left`;
    const secs = differenceInSeconds(end, now);
    return `${secs}s left`;
  }, [endDate, now]);
};

const CountdownBadge = ({ endDate }: { endDate: string }) => {
  const countdown = useCountdown(endDate);
  const isEnded = countdown === "Ended";
  return (
    <Badge variant={isEnded ? "secondary" : "default"} className="flex items-center gap-1 text-xs">
      <Clock className="h-3 w-3" />
      {countdown}
    </Badge>
  );
};

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

  // Owner edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

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
      toast({ variant: "destructive", title: "Challenge not found" });
      navigate("/");
      return;
    }

    setChallenge(challengeData as Challenge);

    const { data: parts } = await supabase
      .from("participations")
      .select(`
        id, user_id, is_active,
        profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)
      `)
      .eq("challenge_id", id)
      .eq("is_active", true);

    setParticipants(parts as Participation[] || []);
    const myPart = parts?.find(p => p.user_id === session.user.id);
    setMyParticipation(myPart || null);

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
      .insert({ challenge_id: id, user_id: session.user.id, is_active: true });

    if (error) {
      toast({ variant: "destructive", title: "Failed to join", description: error.message });
    } else {
      toast({ title: "Joined!", description: "You're now part of this challenge." });
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
      toast({ variant: "destructive", title: "Failed to quit", description: error.message });
    } else {
      toast({ title: "Left challenge", description: "You've quit this challenge." });
      loadData();
    }
  };

  const handleSubmitProof = async () => {
    if (!myParticipation) return;
    if (!proofText.trim() && !proofQuantity) {
      toast({ variant: "destructive", title: "Missing proof", description: "Please provide proof details." });
      return;
    }
    setSubmittingProof(true);
    const { error } = await supabase.from("proofs").insert({
      participation_id: myParticipation.id,
      challenge_id: id,
      text: proofText.trim() || null,
      quantity_value: proofQuantity ? parseInt(proofQuantity) : null,
    });
    setSubmittingProof(false);
    if (error) {
      toast({ variant: "destructive", title: "Failed to submit", description: error.message });
    } else {
      toast({ title: "Proof submitted!", description: "Your proof has been added." });
      setProofText("");
      setProofQuantity("");
      setDialogOpen(false);
      await supabase.from("participations").update({ is_done: true }).eq("id", myParticipation.id);
      loadData();
    }
  };

  const getAvatarSrc = (prof: Profile) => {
    if (prof.use_avatar && prof.avatar_url) return prof.avatar_url;
    if (prof.profile_photo_url) return prof.profile_photo_url;
    return "";
  };

  // Owner actions
  const handleEditChallenge = async () => {
    if (!challenge) return;
    setSaving(true);
    const { error } = await supabase
      .from("challenges")
      .update({ title: editTitle.trim(), description: editDescription.trim() })
      .eq("id", challenge.id);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Failed to update", description: error.message });
    } else {
      toast({ title: "Challenge updated!" });
      setEditDialogOpen(false);
      loadData();
    }
  };

  const handleDeleteChallenge = async () => {
    if (!challenge) return;
    const { error } = await supabase.from("challenges").delete().eq("id", challenge.id);
    if (error) {
      toast({ variant: "destructive", title: "Failed to delete", description: error.message });
    } else {
      toast({ title: "Challenge deleted" });
      navigate("/");
    }
  };

  const handleRemoveParticipant = async (participationId: string, displayName: string) => {
    const { error } = await supabase
      .from("participations")
      .update({ is_active: false })
      .eq("id", participationId);
    if (error) {
      toast({ variant: "destructive", title: "Failed to remove", description: error.message });
    } else {
      toast({ title: `${displayName} removed from the challenge` });
      loadData();
    }
  };

  const openEditDialog = () => {
    if (!challenge) return;
    setEditTitle(challenge.title);
    setEditDescription(challenge.description);
    setEditDialogOpen(true);
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
                <Badge variant={challenge.is_public ? "secondary" : "outline"} className="text-xs">
                  {challenge.is_public ? "🌍 Public" : "🔒 Private"}
                </Badge>
              </div>
            </div>
            {isOwner && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={openEditDialog}
                  className="text-white hover:bg-white/20"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this challenge?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. All participants and proofs will be affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteChallenge} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Edit Challenge Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Challenge</DialogTitle>
            <DialogDescription>Update the challenge title and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
              />
            </div>
            <Button onClick={handleEditChallenge} disabled={saving || !editTitle.trim()} className="w-full">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <Card className="shadow-elevated">
          <CardHeader className="pb-3">
            {/* Creator - small at top */}
            <div className="flex items-center gap-2 mb-3">
              <Avatar className="h-6 w-6">
                <AvatarImage src={getAvatarSrc(challenge.profiles)} />
                <AvatarFallback className="text-xs">{challenge.profiles.display_name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">by {challenge.profiles.display_name}</span>
            </div>

            {/* Dates + Countdown */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-sm text-muted-foreground">
                {format(new Date(challenge.start_date), "MMM d")} → {format(new Date(challenge.end_date), "MMM d, yyyy")}
              </p>
              <CountdownBadge endDate={challenge.end_date} />
            </div>

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

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                <span>{participants.length} participant{participants.length !== 1 ? "s" : ""}</span>
              </div>
              {isOwner && challenge.status === "active" && (
                <InviteParticipants
                  challengeId={challenge.id}
                  currentUserId={currentUserId}
                  existingParticipantIds={participants.map(p => p.user_id)}
                  onInviteSent={loadData}
                />
              )}
            </div>

            {/* Participant list with remove button for owner */}
            <div className="space-y-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getAvatarSrc(p.profiles)} />
                    <AvatarFallback>{p.profiles.display_name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium">{p.profiles.display_name}</span>
                  {isOwner && p.user_id !== currentUserId && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove {p.profiles.display_name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove them from the challenge. They can rejoin if the challenge is public.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveParticipant(p.id, p.profiles.display_name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
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
                    <DialogDescription>Prove you completed the challenge</DialogDescription>
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
