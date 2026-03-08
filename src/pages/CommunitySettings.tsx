import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, ImagePlus, Save, Trash2 } from "lucide-react";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import HeaderLogo from "@/components/HeaderLogo";

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

const CommunitySettings = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { headerClass } = useAutoHideHeader();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [rules, setRules] = useState("");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");
  const [sponsorCtaText, setSponsorCtaText] = useState("");
  const [sponsorCtaUrl, setSponsorCtaUrl] = useState("");
  const [isBrand, setIsBrand] = useState(false);

  // Image state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [slug]);

  const loadSettings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    setUserId(session.user.id);

    const { data: c } = await supabase
      .from("communities")
      .select("*")
      .eq("slug", slug)
      .single();

    if (!c) { navigate("/communities"); return; }

    // Check if user is admin
    const { data: membership } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", c.id)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      toast({ variant: "destructive", title: "Access denied", description: "You must be an admin to access settings." });
      navigate(`/community/${slug}`);
      return;
    }

    setCommunityId(c.id);
    setName(c.name);
    setDescription(c.description || "");
    setCategory(c.category || "general");
    setRequiresApproval(c.requires_approval);
    setRules(c.rules || "");
    setAccentColor(c.accent_color || "#6366f1");
    setWebsiteUrl(c.website_url || "");
    setRewardDescription(c.reward_description || "");
    setSponsorCtaText(c.sponsor_cta_text || "");
    setSponsorCtaUrl(c.sponsor_cta_url || "");
    setIsBrand(c.type === "brand");
    setLogoUrl(c.logo_url);
    setBannerUrl(c.banner_url);
    setLoading(false);
  };

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

  const uploadImage = async (file: File, folder: string) => {
    if (!userId) throw new Error("Not authenticated");
    const ext = file.name.split(".").pop();
    const path = `${userId}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("communities").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("communities").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!communityId) return;
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }

    setSaving(true);
    try {
      let newLogoUrl = logoUrl;
      let newBannerUrl = bannerUrl;

      if (logoFile) newLogoUrl = await uploadImage(logoFile, "logos");
      if (bannerFile) newBannerUrl = await uploadImage(bannerFile, "banners");

      const { error } = await supabase
        .from("communities")
        .update({
          name: name.trim(),
          description: description.trim(),
          category,
          requires_approval: requiresApproval,
          rules: rules.trim() || null,
          accent_color: accentColor,
          logo_url: newLogoUrl,
          banner_url: newBannerUrl,
          website_url: websiteUrl.trim() || null,
          reward_description: rewardDescription.trim() || null,
          sponsor_cta_text: sponsorCtaText.trim() || null,
          sponsor_cta_url: sponsorCtaUrl.trim() || null,
        } as any)
        .eq("id", communityId);

      if (error) throw error;

      // Update local state
      setLogoUrl(newLogoUrl);
      setBannerUrl(newBannerUrl);
      setLogoFile(null);
      setBannerFile(null);

      toast({ title: "✅ Settings saved!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImage = (target: "logo" | "banner") => {
    if (target === "logo") {
      setLogoUrl(null);
      setLogoFile(null);
      setLogoPreview(null);
    } else {
      setBannerUrl(null);
      setBannerFile(null);
      setBannerPreview(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  const displayLogo = logoPreview || logoUrl;
  const displayBanner = bannerPreview || bannerUrl;

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 relative">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/community/${slug}`)} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-white">Community Settings</h1>
            <div className="ml-auto"><HeaderLogo /></div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-6 pb-24">
        {/* Banner & Logo */}
        <Card className="overflow-hidden shadow-card">
          <label className="relative block cursor-pointer group">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, "banner")} />
            {displayBanner ? (
              <div className="relative">
                <img src={displayBanner} alt="Banner" className="w-full h-36 object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={(e) => { e.preventDefault(); handleRemoveImage("banner"); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="w-full h-36 bg-muted flex flex-col items-center justify-center gap-2 group-hover:bg-muted/80 transition-colors">
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Change banner image</span>
              </div>
            )}
          </label>

          <div className="flex justify-center -mt-10 relative z-[1]">
            <div className="relative">
              <label className="cursor-pointer group">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, "logo")} />
                {displayLogo ? (
                  <img src={displayLogo} alt="Logo" className="h-20 w-20 rounded-2xl border-4 border-background object-cover shadow-elevated" />
                ) : (
                  <div className="h-20 w-20 rounded-2xl border-4 border-background bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors shadow-elevated">
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </label>
              {displayLogo && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -right-1 h-6 w-6"
                  onClick={() => handleRemoveImage("logo")}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2 pb-4">Tap to update logo & banner</p>
        </Card>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Community Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={3} />
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

        {/* Accent Color */}
        <div className="space-y-2">
          <Label htmlFor="accent">Accent Color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="accent"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-10 w-14 rounded-lg border border-border cursor-pointer"
            />
            <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="flex-1" maxLength={7} />
          </div>
        </div>

        {/* Join approval */}
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl border">
          <div>
            <p className="font-medium text-sm">Require join approval</p>
            <p className="text-xs text-muted-foreground">Review requests before accepting members</p>
          </div>
          <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
        </div>

        {/* Rules */}
        <div className="space-y-2">
          <Label htmlFor="rules">Community Rules</Label>
          <Textarea id="rules" value={rules} onChange={(e) => setRules(e.target.value)} maxLength={1000} rows={4} placeholder="Be respectful, no spam..." />
        </div>

        {/* Brand settings */}
        {isBrand && (
          <Card className="shadow-card border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm text-primary">Brand Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input id="website" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward">Rewards & Prizes</Label>
                <Textarea id="reward" value={rewardDescription} onChange={(e) => setRewardDescription(e.target.value)} maxLength={500} rows={3} placeholder="Describe rewards..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaText">Sponsor CTA Text</Label>
                <Input id="ctaText" value={sponsorCtaText} onChange={(e) => setSponsorCtaText(e.target.value)} maxLength={50} placeholder="Shop Now" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaUrl">Sponsor CTA Link</Label>
                <Input id="ctaUrl" value={sponsorCtaUrl} onChange={(e) => setSponsorCtaUrl(e.target.value)} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save */}
        <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full h-12 text-base font-semibold bg-gradient-primary">
          <Save className="h-5 w-5 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </main>
    </div>
  );
};

export default CommunitySettings;
