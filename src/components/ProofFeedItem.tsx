import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ThumbsUp, ThumbsDown, Award, Trash2, Pencil, MessageCircle,
  Camera, Video, X, Send,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  use_avatar: boolean;
}

interface ProofFeedItemProps {
  proof: {
    id: string;
    image_url: string | null;
    video_url: string | null;
    text: string | null;
    created_at: string;
    participation_id: string;
    challenge_id: string;
    participations: {
      user_id: string;
      profiles: Profile;
    };
  };
  currentUserId: string;
  askNumericScore: boolean;
  challengeStatus: string;
  onRefresh: () => void;
}

interface Reaction {
  id: string;
  reaction_type: string;
  user_id: string;
}

interface Comment {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
  profiles?: Profile;
}

interface Vote {
  id: string;
  vote_type: string;
  numeric_score: number | null;
  voter_id: string;
}

const REACTION_EMOJIS = [
  { type: "thumbsup", icon: "👍" },
  { type: "heart", icon: "❤️" },
  { type: "laugh", icon: "😂" },
  { type: "thumbsdown", icon: "👎" },
];

const getAvatarSrc = (prof: Profile) => {
  if (prof.use_avatar && prof.avatar_url) return prof.avatar_url;
  if (prof.profile_photo_url) return prof.profile_photo_url;
  return "";
};

const ProofFeedItem = ({ proof, currentUserId, askNumericScore, challengeStatus, onRefresh }: ProofFeedItemProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAuthor = currentUserId === proof.participations.user_id;

  // Reactions
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showReactions, setShowReactions] = useState(false);
  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  // Vote
  const [myVote, setMyVote] = useState<Vote | null>(null);
  const [allVotes, setAllVotes] = useState<Vote[]>([]);
  const [voteType, setVoteType] = useState("");
  const [numericScore, setNumericScore] = useState<number[]>([5]);
  const [showVotePanel, setShowVotePanel] = useState(false);
  const [submittingVote, setSubmittingVote] = useState(false);
  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(proof.text || "");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  // Long press
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadInteractions();
  }, [proof.id]);

  const loadInteractions = async () => {
    const [reactionsRes, commentsRes, voteRes, allVotesRes] = await Promise.all([
      supabase.from("proof_reactions").select("*").eq("proof_id", proof.id),
      supabase.from("proof_comments").select("*, profiles:user_id(id, display_name, avatar_url, profile_photo_url, use_avatar)").eq("proof_id", proof.id).order("created_at", { ascending: true }),
      supabase.from("votes").select("*").eq("proof_id", proof.id).eq("voter_id", currentUserId).maybeSingle(),
      supabase.from("votes").select("*").eq("proof_id", proof.id),
    ]);
    setReactions(reactionsRes.data || []);
    setComments(commentsRes.data as Comment[] || []);
    setAllVotes(allVotesRes.data || []);
    if (voteRes.data) {
      setMyVote(voteRes.data);
      setVoteType(voteRes.data.vote_type);
      if (voteRes.data.numeric_score) setNumericScore([voteRes.data.numeric_score]);
    }
  };

  // Reactions
  const toggleReaction = async (type: string) => {
    const existing = reactions.find(r => r.user_id === currentUserId && r.reaction_type === type);
    if (existing) {
      await supabase.from("proof_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("proof_reactions").insert({ proof_id: proof.id, user_id: currentUserId, reaction_type: type });
    }
    loadInteractions();
  };

  // Long press handlers
  const handlePointerDown = () => {
    longPressTimer.current = setTimeout(() => {
      setShowReactions(true);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Comments
  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    const { error } = await supabase.from("proof_comments").insert({
      proof_id: proof.id, user_id: currentUserId, text: commentText.trim(),
    });
    setSubmittingComment(false);
    if (!error) {
      setCommentText("");
      loadInteractions();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("proof_comments").delete().eq("id", commentId);
    loadInteractions();
  };

  // Vote
  const handleSubmitVote = async () => {
    if (!voteType) return;
    setSubmittingVote(true);
    let score: number | null = null;
    if (voteType === "honor") score = 10;
    else if (voteType === "validated") score = askNumericScore ? numericScore[0] : 5;
    else score = 0;

    if (myVote) {
      await supabase.from("votes").update({ vote_type: voteType, numeric_score: score }).eq("id", myVote.id);
    } else {
      await supabase.from("votes").insert({ proof_id: proof.id, voter_id: currentUserId, vote_type: voteType, numeric_score: score });
    }
    toast({ title: myVote ? "Vote updated!" : "Vote submitted!" });
    setSubmittingVote(false);
    setShowVotePanel(false);
    loadInteractions();
    onRefresh();
  };

  // Delete proof
  const handleDeleteProof = async () => {
    const { error } = await supabase.from("proofs").delete().eq("id", proof.id);
    if (error) {
      toast({ variant: "destructive", title: "Failed to delete proof", description: error.message });
    } else {
      toast({ title: "Proof deleted" });
      onRefresh();
    }
  };

  // Edit proof
  const handleEditProof = async () => {
    setSavingEdit(true);
    let updateData: Record<string, unknown> = { text: editText.trim() || null };

    if (editFile) {
      const fileExt = editFile.name.split(".").pop();
      const filePath = `${currentUserId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("proofs").upload(filePath, editFile);
      if (uploadError) {
        setSavingEdit(false);
        toast({ variant: "destructive", title: "Upload failed", description: uploadError.message });
        return;
      }
      const { data: urlData } = supabase.storage.from("proofs").getPublicUrl(filePath);
      const isVideo = editFile.type.startsWith("video/");
      updateData.image_url = !isVideo ? urlData.publicUrl : null;
      updateData.video_url = isVideo ? urlData.publicUrl : null;
    }

    const { error } = await supabase.from("proofs").update(updateData).eq("id", proof.id);
    setSavingEdit(false);
    if (error) {
      toast({ variant: "destructive", title: "Failed to update", description: error.message });
    } else {
      toast({ title: "Proof updated!" });
      setEditOpen(false);
      setEditFile(null);
      setEditPreview(null);
      onRefresh();
    }
  };

  // Computed
  const reactionCounts = REACTION_EMOJIS.map(r => ({
    ...r,
    count: reactions.filter(rx => rx.reaction_type === r.type).length,
    myReaction: reactions.some(rx => rx.reaction_type === r.type && rx.user_id === currentUserId),
  }));
  const totalReactions = reactions.length;

  const honorCount = allVotes.filter(v => v.vote_type === "honor").length;
  const validatedCount = allVotes.filter(v => v.vote_type === "validated").length;
  const rejectedCount = allVotes.filter(v => v.vote_type === "rejected").length;

  const myVoteLabel = myVote
    ? myVote.vote_type === "honor" ? "🏆 Honor" : myVote.vote_type === "validated" ? "✅ Validated" : "❌ Not validated"
    : null;

  return (
    <Card className="shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar className="h-10 w-10">
          <AvatarImage src={getAvatarSrc(proof.participations.profiles)} />
          <AvatarFallback>{proof.participations.profiles.display_name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{proof.participations.profiles.display_name}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(proof.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
        </div>
        {isAuthor && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditText(proof.text || ""); setEditOpen(true); }}>
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this proof?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteProof} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Description */}
      {proof.text && (
        <div className="px-4 pb-2">
          <p className="text-sm text-foreground whitespace-pre-wrap">{proof.text}</p>
        </div>
      )}

      {/* Media - long press for reactions */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className="relative select-none"
      >
        {proof.image_url && (
          <img src={proof.image_url} alt="Proof" className="w-full max-h-96 object-cover" draggable={false} />
        )}
        {proof.video_url && (
          <video src={proof.video_url} controls className="w-full max-h-96" />
        )}
        {!proof.image_url && !proof.video_url && (
          <div className="h-12" />
        )}
      </div>

      {/* Vote summary badges - always visible */}
      {allVotes.length > 0 && (
        <div className="px-4 py-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {honorCount > 0 && <span>🏆 {honorCount}</span>}
          {validatedCount > 0 && <span>✅ {validatedCount}</span>}
          {rejectedCount > 0 && <span>❌ {rejectedCount}</span>}
          {totalReactions > 0 && (
            <>
              <span className="mx-1">·</span>
              {reactionCounts.filter(r => r.count > 0).map(r => (
                <span key={r.type}>{r.icon} {r.count}</span>
              ))}
            </>
          )}
        </div>
      )}

      {/* Action bar: vote buttons directly, comments, long-press hint */}
      <div className="px-4 py-2 flex items-center gap-1.5 border-t">
        {/* Direct vote buttons for non-authors */}
        {!isAuthor ? (
          <>
            <Button
              variant={myVote?.vote_type === "honor" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs gap-1"
              onClick={() => { setVoteType("honor"); setShowVotePanel(true); }}
              title="Validated with Honor"
            >
              <Award className="h-4 w-4" /> Honor
            </Button>
            <Button
              variant={myVote?.vote_type === "validated" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs gap-1"
              onClick={() => { setVoteType("validated"); setShowVotePanel(true); }}
              title="Validated"
            >
              <ThumbsUp className="h-4 w-4" /> Valid
            </Button>
            <Button
              variant={myVote?.vote_type === "rejected" ? "destructive" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs gap-1"
              onClick={() => { setVoteType("rejected"); setShowVotePanel(true); }}
              title="Not Validated"
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Your proof</span>
        )}

        <div className="flex-1" />

        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1" onClick={() => setShowComments(!showComments)}>
          <MessageCircle className="h-4 w-4" />
          {comments.length > 0 && <span>{comments.length}</span>}
        </Button>
      </div>

      {/* Vote confirmation panel (for numeric score on "validated") */}
      {showVotePanel && !isAuthor && (
        <div className="px-4 py-3 border-t bg-muted/30 space-y-3">
          <RadioGroup value={voteType} onValueChange={setVoteType} className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="honor" id={`honor-${proof.id}`} />
              <Label htmlFor={`honor-${proof.id}`} className="flex items-center gap-2 cursor-pointer text-sm">
                <Award className="h-4 w-4 text-accent-foreground" /> Validated with Honor (10pts)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="validated" id={`validated-${proof.id}`} />
              <Label htmlFor={`validated-${proof.id}`} className="flex items-center gap-2 cursor-pointer text-sm">
                <ThumbsUp className="h-4 w-4 text-primary" /> Validated {askNumericScore ? "" : "(5pts)"}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="rejected" id={`rejected-${proof.id}`} />
              <Label htmlFor={`rejected-${proof.id}`} className="flex items-center gap-2 cursor-pointer text-sm">
                <ThumbsDown className="h-4 w-4 text-destructive" /> Not Validated (0pts)
              </Label>
            </div>
          </RadioGroup>

          {voteType === "validated" && askNumericScore && (
            <div className="flex items-center gap-3">
              <Label className="text-sm whitespace-nowrap">Score (1-10)</Label>
              <Slider value={numericScore} onValueChange={setNumericScore} min={1} max={10} step={1} className="flex-1" />
              <Badge variant="secondary" className="min-w-[2.5rem] justify-center">{numericScore[0]}</Badge>
            </div>
          )}

          <Button size="sm" onClick={handleSubmitVote} disabled={submittingVote || !voteType} className="w-full">
            {submittingVote ? "..." : myVote ? "Update Vote" : "Submit Vote"}
          </Button>
        </div>
      )}

      {/* Reaction popover (long press) */}
      <Dialog open={showReactions} onOpenChange={setShowReactions}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">React</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center gap-3 py-2">
            {REACTION_EMOJIS.map(r => {
              const mine = reactions.some(rx => rx.reaction_type === r.type && rx.user_id === currentUserId);
              const count = reactions.filter(rx => rx.reaction_type === r.type).length;
              return (
                <button
                  key={r.type}
                  onClick={() => { toggleReaction(r.type); setShowReactions(false); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                    mine ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"
                  }`}
                >
                  <span className="text-2xl">{r.icon}</span>
                  {count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-center text-muted-foreground">Tap to toggle reaction</p>
        </DialogContent>
      </Dialog>

      {/* Comments section */}
      {showComments && (
        <div className="px-4 py-3 border-t bg-muted/20 space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={c.profiles ? getAvatarSrc(c.profiles) : ""} />
                <AvatarFallback className="text-xs">{c.profiles?.display_name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{c.profiles?.display_name || "User"}</p>
                <p className="text-sm">{c.text}</p>
              </div>
              {c.user_id === currentUserId && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteComment(c.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddComment()}
              className="text-sm h-9"
            />
            <Button size="icon" className="h-9 w-9" onClick={handleAddComment} disabled={submittingComment || !commentText.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Proof</DialogTitle>
            <DialogDescription>Update your proof description or media</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editFile && proof.image_url && (
              <img src={proof.image_url} alt="Current" className="rounded-lg w-full max-h-48 object-cover" />
            )}
            {editPreview && (
              <div className="relative">
                <Button variant="ghost" size="icon" onClick={() => { setEditFile(null); setEditPreview(null); }} className="absolute top-2 right-2 z-10 h-8 w-8 bg-background/80 rounded-full">
                  <X className="h-4 w-4" />
                </Button>
                <img src={editPreview} alt="New" className="rounded-lg w-full max-h-48 object-cover" />
              </div>
            )}
            <div>
              <Label>Replace media (optional)</Label>
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 mt-1">
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Choose new file</span>
                <input type="file" accept="image/*,video/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setEditFile(f); if (f.type.startsWith("image/")) setEditPreview(URL.createObjectURL(f)); }
                }} />
              </label>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} />
            </div>
            <Button onClick={handleEditProof} disabled={savingEdit} className="w-full">
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ProofFeedItem;
