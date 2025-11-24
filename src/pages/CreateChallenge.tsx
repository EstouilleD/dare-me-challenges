import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft } from "lucide-react";

interface ChallengeType {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const CreateChallenge = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState<ChallengeType[]>([]);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [askNumericScore, setAskNumericScore] = useState(false);
  const [demoVideoUrl, setDemoVideoUrl] = useState("");

  useEffect(() => {
    loadTypes();
    // Set default start date to today
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
  }, []);

  const loadTypes = async () => {
    const { data } = await supabase
      .from("challenge_types")
      .select("*")
      .order("name");

    if (data) {
      setTypes(data);
      if (data.length > 0) {
        setSelectedTypeId(data[0].id);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all required fields.",
      });
      return;
    }

    if (!endDate || new Date(endDate) <= new Date(startDate)) {
      toast({
        variant: "destructive",
        title: "Invalid dates",
        description: "End date must be after start date.",
      });
      return;
    }

    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let status = "upcoming";
    if (start <= now && end >= now) {
      status = "active";
    } else if (end < now) {
      status = "finished";
    }

    const { data: challenge, error } = await supabase
      .from("challenges")
      .insert({
        owner_id: session.user.id,
        title: title.trim(),
        description: description.trim(),
        type_id: selectedTypeId,
        is_public: isPublic,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        ask_numeric_score: askNumericScore,
        demo_video_url: demoVideoUrl.trim() || null,
        status,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Challenge creation failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Challenge created!",
        description: "Your challenge is ready.",
      });
      navigate(`/challenge/${challenge.id}`);
    }
  };

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
            <h1 className="text-2xl font-bold text-white">Create Challenge</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>New Challenge</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter challenge title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the challenge..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                />
              </div>

              <div className="space-y-3">
                <Label>Challenge Type *</Label>
                <RadioGroup value={selectedTypeId} onValueChange={setSelectedTypeId}>
                  {types.map((type) => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={type.id} id={type.id} />
                      <Label htmlFor={type.id} className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xl">{type.icon}</span>
                        <div>
                          <div className="font-medium">{type.name}</div>
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is-public">Public challenge</Label>
                <Switch
                  id="is-public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date *</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ask-score">Ask for numeric score (1-10)</Label>
                  <p className="text-sm text-muted-foreground">Voters rate proofs with a score</p>
                </div>
                <Switch
                  id="ask-score"
                  checked={askNumericScore}
                  onCheckedChange={setAskNumericScore}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="demo-video">Demo Video URL (optional)</Label>
                <Input
                  id="demo-video"
                  placeholder="https://youtube.com/..."
                  value={demoVideoUrl}
                  onChange={(e) => setDemoVideoUrl(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Challenge 🚀"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateChallenge;
