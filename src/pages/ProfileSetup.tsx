import { useState, useEffect } from "react";
import { trackEvent } from "@/hooks/useTrackEvent";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AVATARS } from "@/lib/avatars";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [useAvatar, setUseAvatar] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].key);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  useEffect(() => {
    // Check if user already has a profile
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile && profile.display_name) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast({
        variant: "destructive",
        title: "Display name required",
        description: "Please enter your display name.",
      });
      return;
    }

    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    let profilePhotoUrl = "";
    if (!useAvatar && photoFile) {
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, photoFile);

      if (uploadError) {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: uploadError.message,
        });
        setLoading(false);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      profilePhotoUrl = data.publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        full_name: fullName.trim() || null,
        use_avatar: useAvatar,
        avatar_url: useAvatar ? selectedAvatar : null, // stores stable key like "avatar1.png"
        profile_photo_url: !useAvatar ? profilePhotoUrl : null,
      })
      .eq("id", session.user.id);

    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Profile update failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Profile complete!",
        description: "Welcome to Dare Me!",
      });
      navigate("/onboarding");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">Complete your profile</CardTitle>
          <CardDescription>Let's get to know you better</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name (required)</Label>
              <Input
                id="display-name"
                placeholder="Your nickname"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full-name">Full name (optional)</Label>
              <Input
                id="full-name"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Profile picture</Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="use-avatar" className="text-sm text-muted-foreground">
                    Use avatar
                  </Label>
                  <Switch
                    id="use-avatar"
                    checked={useAvatar}
                    onCheckedChange={setUseAvatar}
                  />
                </div>
              </div>

              {useAvatar ? (
                <div className="space-y-3">
                  <Label>Choose an avatar</Label>
                  <div className="flex flex-wrap gap-3">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar.key}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar.key)}
                        className={`transition-all ${
                          selectedAvatar === avatar.key
                            ? "ring-4 ring-primary scale-110"
                            : "hover:scale-105"
                        }`}
                      >
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={avatar.src} />
                          <AvatarFallback>?</AvatarFallback>
                        </Avatar>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="photo-upload">Upload a photo</Label>
                  {photoPreview && (
                    <div className="flex justify-center">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={photoPreview} />
                        <AvatarFallback>Photo</AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Let's go! 🚀"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSetup;
