import { useState, useEffect } from "react";
import { trackEvent } from "@/hooks/useTrackEvent";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, Video, X, Link, Lock, Crown, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { checkCreationLimit } from "@/hooks/usePremium";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import HeaderLogo from "@/components/HeaderLogo";
import { Badge } from "@/components/ui/badge";

interface ChallengeType {
  id: string;
  name: string;
  description: string;
  icon: string;
  has_quantity: boolean;
}

const FREQUENCY_PERIODS = [
  { value: "day", minDays: 1 },
  { value: "week", minDays: 7 },
  { value: "month", minDays: 30 },
  { value: "year", minDays: 365 },
];

const CreateChallenge = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { headerClass } = useAutoHideHeader();

  const periodLabel = (value: string) => ({
    day: t("createChallenge.perDay"),
    week: t("createChallenge.perWeek"),
    month: t("createChallenge.perMonth"),
    year: t("createChallenge.perYear"),
  }[value] ?? value);
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
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [demoPreview, setDemoPreview] = useState<string | null>(null);
  const [demoTab, setDemoTab] = useState("url");
  const [isSurprise, setIsSurprise] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [creationLimitReached, setCreationLimitReached] = useState(false);
  const [creationCount, setCreationCount] = useState(0);

  // Community fields
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [communityName, setCommunityName] = useState<string | null>(null);
  const [communityOnly, setCommunityOnly] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([]);

  // Frequency fields
  const [frequencyQuantity, setFrequencyQuantity] = useState("1");
  const [frequencyPeriod, setFrequencyPeriod] = useState("week");

  // Quantity fields
  const [quantityTarget, setQuantityTarget] = useState("10");

  useEffect(() => {
    loadTypes();
    loadCategories();
    checkLimits();
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);

    // Load community from query param
    const cid = searchParams.get("community");
    if (cid) {
      setCommunityId(cid);
      supabase.from("communities").select("name").eq("id", cid).single().then(({ data }) => {
        if (data) setCommunityName(data.name);
      });
    }
  }, []);

  const checkLimits = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const result = await checkCreationLimit(session.user.id);
    setCreationLimitReached(!result.allowed);
    setCreationCount(result.count);
    // Check premium
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .maybeSingle();
    setIsPremiumUser(sub?.plan === "premium");
  };

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

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name, icon").order("sort_order");
    setCategories(data || []);
  };


  const selectedType = types.find((t) => t.id === selectedTypeId);
  const isFrequency = selectedType?.name === "Frequency";
  const isQuantity = selectedType?.name === "Quantity";

  const getMinEndDate = () => {
    if (!startDate) return "";
    const start = new Date(startDate);
    if (isFrequency) {
      const period = FREQUENCY_PERIODS.find((p) => p.value === frequencyPeriod);
      if (period) {
        const min = new Date(start);
        min.setDate(min.getDate() + period.minDays);
        return min.toISOString().split("T")[0];
      }
    }
    const next = new Date(start);
    next.setDate(next.getDate() + 1);
    return next.toISOString().split("T")[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast({
        variant: "destructive",
        title: t("createChallenge.errorMissingFields"),
        description: t("createChallenge.errorMissingFieldsDesc"),
      });
      return;
    }

    const minEnd = getMinEndDate();
    if (!endDate || endDate < minEnd) {
      toast({
        variant: "destructive",
        title: t("createChallenge.errorInvalidDates"),
        description: isFrequency
          ? t("createChallenge.errorInvalidDatesFreq", { period: periodLabel(frequencyPeriod) })
          : t("createChallenge.errorInvalidDatesBasic"),
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
    if (start <= now && end >= now) status = "active";
    else if (end < now) status = "finished";

    let demoPhotoUrl: string | null = null;
    let demoVidUrl: string | null = null;

    // Upload demo file if provided
    if (demoTab === "file" && demoFile) {
      const fileExt = demoFile.name.split(".").pop();
      const filePath = `demos/${session.user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("proofs")
        .upload(filePath, demoFile);

      if (uploadError) {
        setLoading(false);
        toast({ variant: "destructive", title: t("createChallenge.errorDemoUpload"), description: uploadError.message });
        return;
      }

      const { data: urlData } = supabase.storage.from("proofs").getPublicUrl(filePath);
      if (demoFile.type.startsWith("video/")) {
        demoVidUrl = urlData.publicUrl;
      } else {
        demoPhotoUrl = urlData.publicUrl;
      }
    } else if (demoTab === "url" && demoVideoUrl.trim()) {
      demoVidUrl = demoVideoUrl.trim();
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
        demo_video_url: demoVidUrl,
        demo_photo_url: demoPhotoUrl,
        frequency_quantity: isFrequency ? parseInt(frequencyQuantity) || 1 : null,
        frequency_period: isFrequency ? frequencyPeriod : null,
        quantity_target: isQuantity ? parseInt(quantityTarget) || 10 : null,
        is_surprise: isPremiumUser ? isSurprise : false,
        status,
        community_id: communityId || null,
        community_only: communityId ? communityOnly : false,
        category_id: categoryId || null,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: t("createChallenge.errorCreation"),
        description: error.message,
      });
    } else {
      trackEvent("challenge_created", { challenge_id: challenge.id, type_id: selectedTypeId, is_public: isPublic, community_id: communityId || null });
      toast({ title: t("createChallenge.successTitle"), description: t("createChallenge.successDesc") });
      navigate(`/challenge/${challenge.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-white truncate flex-1">{t("createChallenge.pageTitle")}</h1>
            <HeaderLogo />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>{t("createChallenge.cardTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {creationLimitReached && (
              <div className="mb-6 p-4 rounded-lg bg-accent/50 border border-accent text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm font-medium">
                  <Lock className="h-4 w-4" />
                  {t("createChallenge.limitReached", { count: creationCount })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("createChallenge.limitUpgrade")}
                </p>
                <Button size="sm" variant="default" className="gap-1" onClick={() => navigate("/store")}>
                  <Crown className="h-3 w-3" /> {t("createChallenge.goPremium")}
                </Button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Community banner */}
              {communityId && communityName && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{t("createChallenge.creatingIn", { name: communityName })}</span>
                </div>
              )}

              {/* Community only toggle */}
              {communityId && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="community-only">{t("createChallenge.communityOnly")}</Label>
                    <p className="text-sm text-muted-foreground">{t("createChallenge.communityOnlyDesc")}</p>
                  </div>
                  <Switch id="community-only" checked={communityOnly} onCheckedChange={setCommunityOnly} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="title">{t("createChallenge.titleLabel")} *</Label>
                <Input
                  id="title"
                  placeholder={t("createChallenge.titlePlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("createChallenge.descriptionLabel")} *</Label>
                <Textarea
                  id="description"
                  placeholder={t("createChallenge.descriptionPlaceholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                />
              </div>

              <div className="space-y-3">
                <Label>{t("createChallenge.typeLabel")} *</Label>
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

              {/* Category */}
              <div className="space-y-2">
                <Label>{t("createChallenge.categoryLabel")}</Label>
                <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("createChallenge.categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("createChallenge.categoryNone")}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isFrequency && (
                <Card className="border-dashed">
                  <CardContent className="pt-4 space-y-4">
                    <p className="text-sm font-medium">{t("createChallenge.frequencyTitle")}</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="freq-qty">{t("createChallenge.frequencyQty")} *</Label>
                        <Input
                          id="freq-qty"
                          type="number"
                          min={1}
                          value={frequencyQuantity}
                          onChange={(e) => setFrequencyQuantity(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("createChallenge.frequencyPeriodLabel")} *</Label>
                        <Select value={frequencyPeriod} onValueChange={setFrequencyPeriod}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCY_PERIODS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {periodLabel(p.value)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("createChallenge.frequencyExample", { qty: frequencyQuantity, period: periodLabel(frequencyPeriod).toLowerCase() })}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Quantity-specific fields */}
              {isQuantity && (
                <Card className="border-dashed">
                  <CardContent className="pt-4 space-y-4">
                    <p className="text-sm font-medium">{t("createChallenge.quantityTitle")}</p>
                    <div className="space-y-2">
                      <Label htmlFor="qty-target">{t("createChallenge.quantityLabel")} *</Label>
                      <Input
                        id="qty-target"
                        type="number"
                        min={1}
                        max={100}
                        value={quantityTarget}
                        onChange={(e) => setQuantityTarget(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("createChallenge.quantityDesc", { qty: quantityTarget })}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="is-public">{t("createChallenge.publicLabel")}</Label>
                <Switch id="is-public" checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="is-surprise">{t("createChallenge.surpriseLabel")}</Label>
                    {!isPremiumUser && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Crown className="h-3 w-3" /> Premium
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{t("createChallenge.surpriseDesc")}</p>
                </div>
                <Switch 
                  id="is-surprise" 
                  checked={isSurprise} 
                  onCheckedChange={setIsSurprise}
                  disabled={!isPremiumUser}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start-date">{t("createChallenge.startDate")} *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">
                    {t("createChallenge.endDate")} *
                    {isFrequency && (
                      <span className="text-xs text-muted-foreground ml-1">
                        {t("createChallenge.endDateMin", { period: periodLabel(frequencyPeriod).toLowerCase() })}
                      </span>
                    )}
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    min={getMinEndDate()}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ask-score">{t("createChallenge.numericScore")}</Label>
                  <p className="text-sm text-muted-foreground">{t("createChallenge.numericScoreDesc")}</p>
                </div>
                <Switch id="ask-score" checked={askNumericScore} onCheckedChange={setAskNumericScore} />
              </div>

              <div className="space-y-2">
                <Label>{t("createChallenge.demoLabel")}</Label>
                <Tabs value={demoTab} onValueChange={setDemoTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="url" className="flex-1 gap-1">
                      <Link className="h-3 w-3" /> {t("createChallenge.demoUrl")}
                    </TabsTrigger>
                    <TabsTrigger value="file" className="flex-1 gap-1">
                      <Camera className="h-3 w-3" /> {t("createChallenge.demoUpload")}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="url">
                    <Input
                      placeholder={t("createChallenge.demoUrlPlaceholder")}
                      value={demoVideoUrl}
                      onChange={(e) => setDemoVideoUrl(e.target.value)}
                    />
                  </TabsContent>
                  <TabsContent value="file">
                    {!demoFile ? (
                      <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Camera className="h-5 w-5 text-muted-foreground" />
                          <Video className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="text-sm text-muted-foreground">{t("createChallenge.demoUploadPrompt")}</span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setDemoFile(file);
                            if (file.type.startsWith("image/")) {
                              setDemoPreview(URL.createObjectURL(file));
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDemoFile(null);
                            if (demoPreview) {
                              URL.revokeObjectURL(demoPreview);
                              setDemoPreview(null);
                            }
                          }}
                          className="absolute top-2 right-2 z-10 h-8 w-8 bg-background/80 hover:bg-background rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        {demoPreview ? (
                          <img src={demoPreview} alt="Demo preview" className="rounded-lg w-full max-h-48 object-cover" />
                        ) : (
                          <div className="flex items-center gap-2 p-4 rounded-lg bg-accent/30 border">
                            <Video className="h-5 w-5 text-primary" />
                            <span className="text-sm font-medium truncate">{demoFile.name}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              <Button type="submit" className="w-full" disabled={loading || creationLimitReached}>
                {loading ? t("createChallenge.creating") : creationLimitReached ? t("createChallenge.limitButton") : t("createChallenge.submitButton")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateChallenge;
