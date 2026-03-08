import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, ImagePlus, Globe, Lock, BadgeCheck, Info } from "lucide-react";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import HeaderLogo from "@/components/HeaderLogo";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const CATEGORIES = [
  { value: "sports", label: "🏃 Sports & Fitness" },
  { value: "cooking", label: "🍳 Cooking & Food" },
  { value: "wellness", label: "🧘 Wellness & Health" },
  { value: "productivity", label: "📈 Productivity" },
  { value: "family", label: "👨‍👩‍👧 Family & Friends" },
  { value: "education", label: "📚 Education" },
  { value: "creative", label: "🎨 Creative & Arts" },
  { value: "gaming", label: "🎮 Gaming" },
  { value: "music", label: "🎵 Music" },
  { value: "travel", label: "✈️ Travel" },
  { value: "general", label: "🌟 General" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", icon: Globe, label: "Public", description: "Anyone can discover and join" },
  { value: "private", icon: Lock, label: "Private", description: "Invite only, hidden from Explore" },
  { value: "brand", icon: BadgeCheck, label: "Brand", description: "Verified public community for brands" },
];

const CreateCommunity = () => {
  const navigate = useNavigate();
  const { headerClass } = useAutoHideHeader();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [type, setType] = useState<"public" | "private" | "brand">("public");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [rules, setRules] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");
  const [sponsorCtaText, setSponsorCtaText] = useState("");
  const [sponsorCtaUrl, setSponsorCtaUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, target: "logo" | "banner") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max 5 MB" });
      return;
    }
    const url = URL.createObjectURL(file);
    if (target === "logo") { setLogoFile(file); setLogoPreview(url); }
    else { setBannerFile(file); setBannerPreview(url); }
  };

  const uploadImage = async (file: File, userId: string, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${userId}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("communities").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("communities").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name required" });
      return;
    }
    if (name.trim().length < 3) {
      toast({ variant: "destructive", title: "Name too short", description: "At least 3 characters" });
      return;
    }
    if (!description.trim()) {
      toast({ variant: "destructive", title: "Description required" });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const slug = generateSlug(name);

      let logoUrl: string | null = null;
      let bannerUrl: string | null = null;

      if (logoFile) logoUrl = await uploadImage(logoFile, session.user.id, "logos");
      if (bannerFile) bannerUrl = await uploadImage(bannerFile, session.user.id, "banners");

      const { data, error } = await supabase.from("communities").insert({
        name: name.trim(),
        slug,
        description: description.trim(),
        category,
        type,
        requires_approval: type === "private" ? true : requiresApproval,
        rules: rules.trim() || null,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        owner_id: session.user.id,
        website_url: websiteUrl.trim() || null,
        reward_description: rewardDescription.trim() || null,
        sponsor_cta_text: sponsorCtaText.trim() || null,
        sponsor_cta_url: sponsorCtaUrl.trim() || null,
      } as any).select("slug").single();

      if (error) {
        if (error.message.includes("duplicate key") && error.message.includes("slug")) {
          toast({ variant: "destructive", title: "Name already taken", description: "Try a different community name" });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: "🎉 Community created!", description: "Invite members and start challenging!" });
      navigate(`/community/${data.slug}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 relative">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-white">Create Community</h1>
            <div className="ml-auto"><HeaderLogo /></div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-6 pb-24">
        {/* Banner */}
        <Card className="overflow-hidden shadow-card">
          <label className="relative block cursor-pointer group">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, "banner")} />
            {bannerPreview ? (
              <img src={bannerPreview} alt="Banner" className="w-full h-36 object-cover" />
            ) : (
              <div className="w-full h-36 bg-muted flex flex-col items-center justify-center gap-2 group-hover:bg-muted/80 transition-colors">
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Add a banner image</span>
              </div>
            )}
          </label>

          {/* Logo overlay */}
          <div className="flex justify-center -mt-10 relative z-[1]">
            <label className="cursor-pointer group">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, "logo")} />
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-20 w-20 rounded-2xl border-4 border-background object-cover shadow-elevated" />
              ) : (
                <div className="h-20 w-20 rounded-2xl border-4 border-background bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors shadow-elevated">
                  <Camera className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </label>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2 pb-4">Tap to add logo & banner</p>
        </Card>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Community Name *</Label>
          <Input
            id="name"
            placeholder="e.g. Sunday Runners Club"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
          {name && (
            <p className="text-xs text-muted-foreground">
              URL: /community/{generateSlug(name) || "..."}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="desc">Short Description *</Label>
          <Textarea
            id="desc"
            placeholder="What is your community about? Keep it short and engaging."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">{description.length}/300</p>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Visibility */}
        <div className="space-y-3">
          <Label>Visibility</Label>
          <RadioGroup value={type} onValueChange={(v) => setType(v as any)} className="space-y-2">
            {VISIBILITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  type === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <RadioGroupItem value={opt.value} className="sr-only" />
                <opt.icon className={`h-5 w-5 ${type === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </label>
            ))}
          </RadioGroup>

          {type === "brand" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted text-xs text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Brand communities require verification by our team. You can create it now and apply for verification later.</span>
            </div>
          )}
        </div>

        {/* Join Approval */}
        {type !== "private" && (
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl border">
            <div>
              <p className="font-medium text-sm">Require join approval</p>
              <p className="text-xs text-muted-foreground">Review requests before accepting members</p>
            </div>
            <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
          </div>
        )}

        {/* Rules */}
        <div className="space-y-2">
          <Label htmlFor="rules">Community Rules (optional)</Label>
          <Textarea
            id="rules"
            placeholder="e.g. Be respectful, no spam, submit proofs honestly..."
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            maxLength={1000}
            rows={4}
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={loading || !name.trim() || !description.trim()}
          className="w-full h-12 text-base font-semibold bg-gradient-primary"
        >
          {loading ? "Creating..." : "🚀 Launch Community"}
        </Button>
      </main>
    </div>
  );
};

export default CreateCommunity;
