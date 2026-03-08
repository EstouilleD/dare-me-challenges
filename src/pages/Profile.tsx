import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import HeaderLogo from "@/components/HeaderLogo";
import { ArrowLeft, User, Lock, Bell, Sun, Moon, Monitor, Palette, Award, Trophy } from "lucide-react";
import BadgeCard from "@/components/BadgeCard";
import { useTheme } from "next-themes";
import { AVATARS, resolveAvatarUrl } from "@/lib/avatars";

interface ProfileData {
  display_name: string;
  full_name: string | null;
  use_avatar: boolean | null;
  avatar_url: string | null;
  profile_photo_url: string | null;
}

interface NotificationPrefs {
  push_enabled: boolean;
  frequency_reminder: boolean;
  end_date_reminder: boolean;
  end_date_hours_before: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { headerClass } = useAutoHideHeader();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<ProfileData>({
    display_name: "",
    full_name: null,
    use_avatar: true,
    avatar_url: null,
    profile_photo_url: null,
  });
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].key);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Notification state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    push_enabled: false,
    frequency_reminder: true,
    end_date_reminder: true,
    end_date_hours_before: 24,
  });
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);
  const [userBadges, setUserBadges] = useState<any[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const [profileRes, notifsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase.from("notification_preferences").select("*").eq("user_id", session.user.id).single(),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);
      if (profileRes.data.use_avatar && profileRes.data.avatar_url) {
        // Store the raw key from DB; resolveAvatarUrl handles legacy hashed paths
        const match = profileRes.data.avatar_url.match(/avatar(\d+)/);
        const key = match ? `avatar${match[1]}.png` : profileRes.data.avatar_url;
        setSelectedAvatar(key);
      }
      if (!profileRes.data.use_avatar && profileRes.data.profile_photo_url) {
        setPhotoPreview(profileRes.data.profile_photo_url);
      }
    }

    if (notifsRes.data) {
      setNotifPrefs(notifsRes.data);
    }

    // Load badges
    const [badgesRes, userBadgesRes] = await Promise.all([
      supabase.from("badges").select("*").order("sort_order"),
      supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", session.user.id),
    ]);
    setBadges(badgesRes.data || []);
    setUserBadges(userBadgesRes.data || []);

    setLoading(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.display_name.trim()) {
      toast({ variant: "destructive", title: "Display name is required" });
      return;
    }
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    let profilePhotoUrl = profile.profile_photo_url;
    if (!profile.use_avatar && photoFile) {
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, photoFile);
      if (uploadError) {
        toast({ variant: "destructive", title: "Upload failed", description: uploadError.message });
        setSaving(false);
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      profilePhotoUrl = data.publicUrl;
    }

    const { error } = await supabase.from("profiles").update({
      display_name: profile.display_name.trim(),
      full_name: profile.full_name?.trim() || null,
      use_avatar: profile.use_avatar,
      avatar_url: profile.use_avatar ? selectedAvatar : null,
      profile_photo_url: !profile.use_avatar ? profilePhotoUrl : null,
    }).eq("id", session.user.id);

    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } else {
      toast({ title: "Profile updated! ✨" });
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Password must be at least 6 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords don't match" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ variant: "destructive", title: "Failed to update password", description: error.message });
    } else {
      toast({ title: "Password updated! 🔒" });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleSaveNotifications = async () => {
    setSavingNotifs(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { error } = await supabase.from("notification_preferences").upsert({
      user_id: session.user.id,
      push_enabled: notifPrefs.push_enabled,
      frequency_reminder: notifPrefs.frequency_reminder,
      end_date_reminder: notifPrefs.end_date_reminder,
      end_date_hours_before: notifPrefs.end_date_hours_before,
    }, { onConflict: "user_id" });

    setSavingNotifs(false);
    if (error) {
      toast({ variant: "destructive", title: "Failed to save preferences", description: error.message });
    } else {
      toast({ title: "Preferences saved! 🔔" });
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { error } = await supabase.functions.invoke("delete-user", {
      body: { target_user_id: session.user.id, reason: "Self-deletion" },
    });

    setDeletingAccount(false);
    if (error) {
      toast({ variant: "destructive", title: "Failed to delete account", description: error.message });
    } else {
      await supabase.auth.signOut();
      navigate("/auth");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 relative">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <HeaderLogo />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5">
              <Palette className="h-4 w-4" /> Theme
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5">
              <Lock className="h-4 w-4" /> Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="h-4 w-4" /> Notifs
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your display info and picture</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display name</Label>
                  <Input
                    id="display-name"
                    value={profile.display_name}
                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full-name">Full name</Label>
                  <Input
                    id="full-name"
                    value={profile.full_name || ""}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Profile picture</Label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="use-avatar" className="text-sm text-muted-foreground">Use avatar</Label>
                      <Switch
                        id="use-avatar"
                        checked={!!profile.use_avatar}
                        onCheckedChange={(v) => setProfile({ ...profile, use_avatar: v })}
                      />
                    </div>
                  </div>

                  {profile.use_avatar ? (
                    <div className="space-y-3">
                      <Label>Choose an avatar</Label>
                      <div className="flex flex-wrap gap-3">
                        {AVATARS.map((avatar) => (
                          <button
                            key={avatar.key}
                            type="button"
                            onClick={() => setSelectedAvatar(avatar.key)}
                            className={`transition-all rounded-full ${
                              selectedAvatar === avatar.key ? "ring-4 ring-primary scale-110" : "hover:scale-105"
                            }`}
                          >
                            <Avatar className="h-14 w-14 bg-white">
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
                      <Input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} />
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveProfile} className="w-full" disabled={saving}>
                  {saving ? "Saving..." : "Save profile"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>


          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Choose your preferred theme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { value: "light", label: "Light", icon: Sun, desc: "Classic light theme" },
                  { value: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
                  { value: "system", label: "System", icon: Monitor, desc: "Follow device settings" },
                ].map(({ value, label, icon: Icon, desc }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                      theme === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className={`p-2 rounded-full ${theme === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button onClick={handleUpdatePassword} className="w-full" disabled={savingPassword}>
                  {savingPassword ? "Updating..." : "Update password"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/50 mt-6">
              <CardHeader>
                <CardTitle className="text-destructive">Delete Account</CardTitle>
                <CardDescription>Permanently delete your account and all your data</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={deletingAccount}>
                      {deletingAccount ? "Deleting..." : "Delete my account"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your account, all your challenges, proofs, and data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, delete my account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage your reminder preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push notifications</Label>
                    <p className="text-sm text-muted-foreground">Enable push alerts</p>
                  </div>
                  <Switch
                    checked={notifPrefs.push_enabled}
                    onCheckedChange={(v) => setNotifPrefs({ ...notifPrefs, push_enabled: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Frequency reminders</Label>
                    <p className="text-sm text-muted-foreground">Remind me to complete challenges</p>
                  </div>
                  <Switch
                    checked={notifPrefs.frequency_reminder}
                    onCheckedChange={(v) => setNotifPrefs({ ...notifPrefs, frequency_reminder: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>End date reminders</Label>
                    <p className="text-sm text-muted-foreground">Alert before a challenge ends</p>
                  </div>
                  <Switch
                    checked={notifPrefs.end_date_reminder}
                    onCheckedChange={(v) => setNotifPrefs({ ...notifPrefs, end_date_reminder: v })}
                  />
                </div>

                {notifPrefs.end_date_reminder && (
                  <div className="space-y-2">
                    <Label htmlFor="hours-before">Hours before end date</Label>
                    <Input
                      id="hours-before"
                      type="number"
                      min={1}
                      max={168}
                      value={notifPrefs.end_date_hours_before}
                      onChange={(e) => setNotifPrefs({ ...notifPrefs, end_date_hours_before: parseInt(e.target.value) || 24 })}
                    />
                  </div>
                )}

                <Button onClick={handleSaveNotifications} className="w-full" disabled={savingNotifs}>
                  {savingNotifs ? "Saving..." : "Save preferences"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
