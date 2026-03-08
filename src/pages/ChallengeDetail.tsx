import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { checkParticipationLimit } from "@/hooks/usePremium";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";
import { ArrowLeft, Users, Trophy, Pencil, Trash2, UserMinus, Clock, UserPlus, Camera, Video, Upload, X, Flag, DoorOpen, Send, Share2 } from "lucide-react";
import ShareChallenge from "@/components/ShareChallenge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProofFeedItem from "@/components/ProofFeedItem";
import PostFeedItem from "@/components/PostFeedItem";
import InviteParticipants from "@/components/InviteParticipants";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import HeaderLogo from "@/components/HeaderLogo";
import ChallengeProgress from "@/components/ChallengeProgress";
import ChallengeRanking from "@/components/ChallengeRanking";
import FinalRankingPodium from "@/components/FinalRankingPodium";
import CoinBoostActions from "@/components/CoinBoostActions";
import confetti from "canvas-confetti";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAvatarSrc } from "@/lib/avatars";
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
  is_surprise: boolean;
  ask_numeric_score: boolean;
  owner_id: string;
  quantity_target: number | null;
  frequency_quantity: number | null;
  frequency_period: string | null;
  community_id: string | null;
  community_only: boolean;
  challenge_types: ChallengeType;
  profiles: Profile;
  communities?: { name: string; slug: string; logo_url: string | null; type: string; is_verified: boolean } | null;
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
  participation_id: string;
  participations: {
    user_id: string;
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
  const { headerClass } = useAutoHideHeader();
  const { toast } = useToast();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<Participation[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [myParticipation, setMyParticipation] = useState<Participation | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [proofText, setProofText] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Owner edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Report state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [postText, setPostText] = useState("");
  const [submittingPost, setSubmittingPost] = useState(false);
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
        profiles(id, display_name, avatar_url, profile_photo_url, use_avatar),
        communities(name, slug, logo_url, type, is_verified)
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
          user_id,
          profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)
        )
      `)
      .eq("challenge_id", id)
      .order("created_at", { ascending: true });

    setProofs(proofsData as Proof[] || []);

    const { data: postsData } = await supabase
      .from("challenge_posts")
      .select("*, profiles:user_id(id, display_name, avatar_url, profile_photo_url, use_avatar)")
      .eq("challenge_id", id)
      .order("created_at", { ascending: true });

    setPosts(postsData || []);
    setLoading(false);
  };

  const handleJoin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Check participation limit
    const limitResult = await checkParticipationLimit(session.user.id);
    if (!limitResult.allowed) {
      toast({
        variant: "destructive",
        title: "Participation limit reached",
        description: `You're in ${limitResult.count}/${limitResult.limit} active challenges. Upgrade to Premium for unlimited.`,
      });
      return;
    }

    // Use upsert to handle rejoining after quitting
    const { error } = await supabase
      .from("participations")
      .upsert(
        { challenge_id: id, user_id: session.user.id, is_active: true, is_done: false, score: 0 },
        { onConflict: "challenge_id,user_id", ignoreDuplicates: false }
      );

    if (error) {
      toast({ variant: "destructive", title: "Failed to join", description: error.message });
    } else {
      toast({ title: "Joined!", description: "You're now part of this challenge." });
      loadData();
    }
  };

  const handleQuit = async () => {
    if (!myParticipation) return;

    // Delete votes cast by this user on proofs in this challenge
    const { data: challengeProofs } = await supabase
      .from("proofs")
      .select("id")
      .eq("challenge_id", challenge!.id);

    if (challengeProofs && challengeProofs.length > 0) {
      const proofIds = challengeProofs.map((p) => p.id);
      await supabase
        .from("votes")
        .delete()
        .in("proof_id", proofIds)
        .eq("voter_id", myParticipation.user_id);
    }

    // Delete proofs submitted by this user for this challenge
    await supabase
      .from("proofs")
      .delete()
      .eq("participation_id", myParticipation.id);

    // Deactivate participation
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    if (file.type.startsWith("image/")) {
      setProofPreview(URL.createObjectURL(file));
    } else {
      setProofPreview(null);
    }
  };

  const clearFile = () => {
    setProofFile(null);
    if (proofPreview) {
      URL.revokeObjectURL(proofPreview);
      setProofPreview(null);
    }
  };

  const handleSubmitProof = async () => {
    if (!myParticipation) return;
    if (!proofFile) {
      toast({ variant: "destructive", title: "Missing proof", description: "Please upload a photo or video." });
      return;
    }
    setSubmittingProof(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Upload file to storage
    const fileExt = proofFile.name.split(".").pop();
    const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("proofs")
      .upload(filePath, proofFile);

    if (uploadError) {
      setSubmittingProof(false);
      toast({ variant: "destructive", title: "Upload failed", description: uploadError.message });
      return;
    }

    const { data: urlData } = supabase.storage.from("proofs").getPublicUrl(filePath);
    const isVideo = proofFile.type.startsWith("video/");

    const { error } = await supabase.from("proofs").insert({
      participation_id: myParticipation.id,
      challenge_id: id,
      text: proofText.trim() || null,
      image_url: !isVideo ? urlData.publicUrl : null,
      video_url: isVideo ? urlData.publicUrl : null,
    });
    setSubmittingProof(false);
    if (error) {
      toast({ variant: "destructive", title: "Failed to submit", description: error.message });
    } else {
      toast({ title: "Proof submitted!", description: "Your proof has been added." });
      setProofText("");
      clearFile();
      setDialogOpen(false);
      await supabase.from("participations").update({ is_done: true }).eq("id", myParticipation.id);
      // 🎉 Confetti!
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      loadData();
    }
  };

  // getAvatarSrc imported from @/lib/avatars

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

  const REPORT_CATEGORIES = [
    "Discrimination or hate speech",
    "Harassment or bullying",
    "Illegal activity",
    "Violent or dangerous content",
    "Sexual or inappropriate content",
    "Spam or misleading",
  ];

  const handleReport = async () => {
    if (!challenge || !reportCategory) return;
    setSubmittingReport(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSubmittingReport(false);
      return;
    }

    // Rate limit: max 5 reports per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("reporter_id", session.user.id)
      .gte("created_at", todayStart.toISOString());

    if ((count ?? 0) >= 5) {
      setSubmittingReport(false);
      toast({ variant: "destructive", title: "Rate limit reached", description: "You can submit a maximum of 5 reports per day." });
      return;
    }

    const { error } = await supabase.from("reports").insert({
      challenge_id: challenge.id,
      reporter_id: session.user.id,
      reason: reportCategory,
      details: reportDetails.trim() || null,
    });
    setSubmittingReport(false);
    if (error) {
      if (error.code === "23505") {
        toast({ variant: "destructive", title: "Already reported", description: "You have already reported this challenge." });
      } else {
        toast({ variant: "destructive", title: "Report failed", description: error.message });
      }
    } else {
      setReportSubmitted(true);
    }
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
  const isFinished = challenge.status === "finished";
  const canJoin = !isParticipant && challenge.status === "active";
  const canPost = (isOwner || isParticipant) && !isFinished;
  

  // Merge proofs and posts into a single feed sorted by date
  const feedItems = [
    ...proofs.map(p => ({ type: "proof" as const, data: p, date: p.created_at })),
    ...posts.map(p => ({ type: "post" as const, data: p, date: p.created_at })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handlePost = async () => {
    if (!postText.trim()) return;
    setSubmittingPost(true);
    const { error } = await supabase.from("challenge_posts").insert({
      challenge_id: challenge.id,
      user_id: currentUserId,
      text: postText.trim(),
    });
    setSubmittingPost(false);
    if (error) {
      toast({ variant: "destructive", title: "Failed to post", description: error.message });
    } else {
      setPostText("");
      loadData();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 relative">
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
            <div className="flex items-center gap-1">
              <ShareChallenge
                challengeId={challenge.id}
                challengeTitle={challenge.title}
                trigger={
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" title="Share">
                    <Share2 className="h-4 w-4" />
                  </Button>
                }
              />
              {isParticipant && !isOwner && !isFinished && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" title="Quit challenge">
                      <DoorOpen className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Quit this challenge?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your proofs and votes will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleQuit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Quit
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {isOwner && (
                <>
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
                </>
              )}
            </div>
            <HeaderLogo />
          </div>
        </div>
      </header>

      {/* Report Challenge Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={(open) => {
        setReportDialogOpen(open);
        if (!open) {
          setReportSubmitted(false);
          setReportCategory("");
          setReportDetails("");
        }
      }}>
        <DialogContent>
          {reportSubmitted ? (
            <>
              <DialogHeader>
                <DialogTitle>Thank you</DialogTitle>
                <DialogDescription>We will review this content.</DialogDescription>
              </DialogHeader>
              <Button onClick={() => setReportDialogOpen(false)} className="w-full">Close</Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Report Challenge</DialogTitle>
                <DialogDescription>Why are you reporting this challenge?</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={reportCategory} onValueChange={setReportCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-details">Additional details (optional)</Label>
                  <Textarea
                    id="report-details"
                    placeholder="Provide more context..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                </div>
                <Button onClick={handleReport} disabled={submittingReport || !reportCategory} className="w-full" variant="destructive">
                  {submittingReport ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
        {/* Finished banner + Podium at top */}
        {isFinished && (
          <>
            <div className="rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 p-4 text-center space-y-1">
              <p className="text-2xl">🏁</p>
              <h3 className="font-bold text-lg">Challenge Completed</h3>
              <p className="text-sm text-muted-foreground">This challenge has ended. No more submissions or votes.</p>
            </div>
            <FinalRankingPodium challengeId={challenge.id} />
          </>
        )}

        <Card className="shadow-elevated">
          <CardHeader className="pb-3">
            {/* Creator - small at top */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={getAvatarSrc(challenge.profiles)} />
                  <AvatarFallback className="text-xs">{challenge.profiles.display_name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">by {challenge.profiles.display_name}</span>
              </div>
              {!isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setReportDialogOpen(true)}
                  className="text-destructive hover:bg-destructive/10 h-8 w-8"
                >
                  <Flag className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Community badge */}
            {challenge.communities && (
              <button
                onClick={() => navigate(`/community/${challenge.communities!.slug}`)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors w-fit mb-2"
              >
                {challenge.communities.logo_url ? (
                  <img src={challenge.communities.logo_url} alt="" className="h-5 w-5 rounded object-cover" />
                ) : (
                  <Users className="h-4 w-4 text-primary" />
                )}
                <span className="text-xs font-medium text-primary">{challenge.communities.name}</span>
                {challenge.community_only && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Members only</Badge>
                )}
              </button>
            )}

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

        {/* Coin Boost - only for active participants */}
        {isParticipant && challenge.status === "active" && myParticipation && !isFinished && (
          <CoinBoostActions
            challengeId={challenge.id}
            participationId={myParticipation.id}
            currentUserId={currentUserId}
            onRefresh={loadData}
          />
        )}

        {/* Progress tracking for Quantity / Frequency challenges */}
        {isParticipant && challenge && (
          <ChallengeProgress
            challengeType={challenge.challenge_types.name}
            quantityTarget={challenge.quantity_target}
            frequencyQuantity={challenge.frequency_quantity}
            frequencyPeriod={challenge.frequency_period}
            startDate={challenge.start_date}
            endDate={challenge.end_date}
            myProofs={proofs.filter(
              (p) => p.participations.user_id === currentUserId
            )}
            isParticipant={isParticipant}
            onSubmitProof={() => setDialogOpen(true)}
            onViewProof={(proofId) => navigate(`/proof/${proofId}`)}
          />
        )}

        {isParticipant && !isFinished && challenge.challenge_types.name !== "Frequency" && challenge.challenge_types.name !== "Quantity" && !proofs.some(p => p.participations.user_id === currentUserId) && (
          <Card className="shadow-elevated border-accent">
            <CardHeader>
              <CardTitle>My Participation</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setDialogOpen(true)}>Submit Proof</Button>
            </CardContent>
          </Card>
        )}

        {/* Proof submission dialog (shared across all challenge types) */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Proof</DialogTitle>
              <DialogDescription>Upload a photo or video as proof</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {!proofFile ? (
                <div className="space-y-2">
                  <Label>Photo or Video *</Label>
                  <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Camera className="h-6 w-6 text-muted-foreground" />
                      <Video className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground">Tap to take or upload</span>
                    <input type="file" accept="image/*,video/*" capture="environment" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <Button variant="ghost" size="icon" onClick={clearFile} className="absolute top-2 right-2 z-10 h-8 w-8 bg-background/80 hover:bg-background rounded-full">
                    <X className="h-4 w-4" />
                  </Button>
                  {proofPreview ? (
                    <img src={proofPreview} alt="Preview" className="rounded-lg w-full max-h-64 object-cover" />
                  ) : (
                    <div className="flex items-center gap-2 p-4 rounded-lg bg-accent/30 border">
                      <Video className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium truncate">{proofFile.name}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="proof-text">Description (optional)</Label>
                <Textarea id="proof-text" placeholder="Add a note..." value={proofText} onChange={(e) => setProofText(e.target.value)} rows={3} />
              </div>
              <Button onClick={handleSubmitProof} disabled={submittingProof || !proofFile} className="w-full">
                {submittingProof ? "Uploading..." : "Submit Proof"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Ranking — only show simple ranking for active challenges */}
        {!isFinished && (
          <ChallengeRanking challengeId={challenge.id} isFinished={false} />
        )}

        {/* Social Feed */}
        {challenge.is_surprise && challenge.status !== "finished" ? (
          <Card className="shadow-card">
            <CardContent className="py-8 text-center text-muted-foreground space-y-2">
              <div className="text-4xl">🤫</div>
              <p className="font-medium">Surprise Challenge!</p>
              <p className="text-sm">Proofs are hidden until the challenge ends.</p>
              {isParticipant && (
                <p className="text-xs">You can still submit your proofs — they just won't be visible to others yet.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Feed ({feedItems.length})
            </h2>

            {/* Post input */}
            {canPost && challenge.status === "active" && (
              <Card className="shadow-card">
                <CardContent className="p-3">
                  <div className="flex items-end gap-2">
                    <Textarea
                      placeholder="Say something to the group..."
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      className="min-h-[40px] max-h-[120px] resize-none text-sm"
                      rows={1}
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 flex-shrink-0"
                      disabled={!postText.trim() || submittingPost}
                      onClick={handlePost}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {feedItems.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No activity yet. Be the first to post!
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {feedItems.map((item) =>
                  item.type === "proof" ? (
                    <ProofFeedItem
                      key={`proof-${item.data.id}`}
                      proof={{ ...item.data, challenge_id: challenge.id }}
                      currentUserId={currentUserId}
                      askNumericScore={challenge.ask_numeric_score}
                      challengeStatus={challenge.status}
                      onRefresh={loadData}
                    />
                  ) : (
                    <PostFeedItem
                      key={`post-${item.data.id}`}
                      post={item.data}
                      currentUserId={currentUserId}
                      onRefresh={loadData}
                    />
                  )
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ChallengeDetail;
