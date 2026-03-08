import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, ThumbsUp, ThumbsDown, Award } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  use_avatar: boolean;
}

interface Proof {
  id: string;
  image_url: string | null;
  video_url: string | null;
  text: string | null;
  quantity_value: number | null;
  created_at: string;
  challenge_id: string;
  participations: {
    user_id: string;
    profiles: Profile;
  };
  challenges: {
    title: string;
    ask_numeric_score: boolean;
  };
}

interface Vote {
  id: string;
  vote_type: string;
  numeric_score: number | null;
}

const ProofDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [proof, setProof] = useState<Proof | null>(null);
  const [myVote, setMyVote] = useState<Vote | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const [voteType, setVoteType] = useState<string>("");
  const [numericScore, setNumericScore] = useState<number[]>([5]);
  const [submitting, setSubmitting] = useState(false);

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

    // Load proof
    const { data: proofData } = await supabase
      .from("proofs")
      .select(`
        *,
        participations!inner(
          user_id,
          profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)
        ),
        challenges!inner(
          title,
          ask_numeric_score
        )
      `)
      .eq("id", id)
      .single();

    if (!proofData) {
      toast({
        variant: "destructive",
        title: "Proof not found",
      });
      navigate("/");
      return;
    }

    setProof(proofData as Proof);

    // Load my vote if exists
    const { data: voteData } = await supabase
      .from("votes")
      .select("*")
      .eq("proof_id", id)
      .eq("voter_id", session.user.id)
      .maybeSingle();

    if (voteData) {
      setMyVote(voteData);
      setVoteType(voteData.vote_type);
      if (voteData.numeric_score) {
        setNumericScore([voteData.numeric_score]);
      }
    }

    setLoading(false);
  };

  const handleSubmitVote = async () => {
    if (!voteType) {
      toast({
        variant: "destructive",
        title: "Select a vote",
        description: "Please choose how to validate this proof.",
      });
      return;
    }

    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let score: number | null = null;
    if (voteType === "honor") {
      score = 10;
    } else if (voteType === "validated" && proof?.challenges.ask_numeric_score) {
      score = numericScore[0];
    }

    if (myVote) {
      // Update existing vote
      const { error } = await supabase
        .from("votes")
        .update({
          vote_type: voteType,
          numeric_score: score,
        })
        .eq("id", myVote.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Failed to update vote",
          description: error.message,
        });
      } else {
        toast({
          title: "Vote updated!",
        });
        
        // Update participation score
        await updateParticipationScore();
        
        loadData();
      }
    } else {
      // Create new vote
      const { error } = await supabase
        .from("votes")
        .insert({
          proof_id: id,
          voter_id: session.user.id,
          vote_type: voteType,
          numeric_score: score,
        });

      if (error) {
        toast({
          variant: "destructive",
          title: "Failed to submit vote",
          description: error.message,
        });
      } else {
        toast({
          title: "Vote submitted!",
          description: "Thank you for voting.",
        });
        
        // Update participation score
        await updateParticipationScore();
        
        loadData();
      }
    }

    setSubmitting(false);
  };

  const updateParticipationScore = async () => {
    if (!proof) return;

    // Calculate total score from all votes
    const { data: votes } = await supabase
      .from("votes")
      .select("numeric_score")
      .eq("proof_id", proof.id);

    const totalScore = votes?.reduce((sum, v) => sum + (v.numeric_score || 0), 0) || 0;

    // Update participation score
    await supabase
      .from("participations")
      .update({ score: totalScore })
      .eq("user_id", proof.participations.user_id)
      .eq("challenge_id", proof.challenge_id);
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
          <p className="text-muted-foreground">Loading proof...</p>
        </div>
      </div>
    );
  }

  if (!proof) return null;

  const isAuthor = currentUserId === proof.participations.user_id;

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/challenge/${proof.challenge_id}`)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">Proof</h1>
              <p className="text-white/80 text-sm">{proof.challenges.title}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        <Card className="shadow-elevated">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={getAvatarSrc(proof.participations.profiles)} />
                  <AvatarFallback>{proof.participations.profiles.display_name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{proof.participations.profiles.display_name}</CardTitle>
                  <CardDescription>
                    {format(new Date(proof.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {proof.text && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{proof.text}</p>
              </div>
            )}
            

            {proof.image_url && (
              <div>
                <h3 className="font-semibold mb-2">Image</h3>
                <img src={proof.image_url} alt="Proof" className="rounded-lg w-full" />
              </div>
            )}

            {proof.video_url && (
              <div>
                <h3 className="font-semibold mb-2">Video</h3>
                <a href={proof.video_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Watch video
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {!isAuthor && (
          <Card className="shadow-elevated border-accent">
            <CardHeader>
              <CardTitle>Vote on this proof</CardTitle>
              <CardDescription>
                {myVote ? "You've already voted. You can update your vote below." : "How would you validate this proof?"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={voteType} onValueChange={setVoteType}>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="honor" id="honor" />
                  <Label htmlFor="honor" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Award className="h-5 w-5 text-accent" />
                    <div>
                      <div className="font-medium">Validated with Honor</div>
                      <div className="text-sm text-muted-foreground">Outstanding achievement! (Score: 10)</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="validated" id="validated" />
                  <Label htmlFor="validated" className="flex items-center gap-2 cursor-pointer flex-1">
                    <ThumbsUp className="h-5 w-5 text-success" />
                    <div>
                      <div className="font-medium">Validated</div>
                      <div className="text-sm text-muted-foreground">Challenge completed successfully</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="rejected" id="rejected" />
                  <Label htmlFor="rejected" className="flex items-center gap-2 cursor-pointer flex-1">
                    <ThumbsDown className="h-5 w-5 text-destructive" />
                    <div>
                      <div className="font-medium">Not Validated</div>
                      <div className="text-sm text-muted-foreground">Doesn't meet requirements</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {voteType === "validated" && proof.challenges.ask_numeric_score && (
                <div className="space-y-4">
                  <Label>Score (1-10)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={numericScore}
                      onValueChange={setNumericScore}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <Badge variant="secondary" className="text-lg px-3 py-1 min-w-[3rem] justify-center">
                      {numericScore[0]}
                    </Badge>
                  </div>
                </div>
              )}

              <Button onClick={handleSubmitVote} disabled={submitting} className="w-full">
                {submitting ? "Submitting..." : myVote ? "Update Vote" : "Submit Vote"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isAuthor && (
          <Card className="shadow-card">
            <CardContent className="py-6 text-center text-muted-foreground">
              This is your proof. You cannot vote on it.
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ProofDetail;
