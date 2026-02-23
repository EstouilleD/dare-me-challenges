import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Mail, QrCode, Search, Check, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  use_avatar: boolean;
  email: string;
}

interface InviteParticipantsProps {
  challengeId: string;
  currentUserId: string;
  existingParticipantIds: string[];
  onInviteSent: () => void;
}

const InviteParticipants = ({ challengeId, currentUserId, existingParticipantIds, onInviteSent }: InviteParticipantsProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Search users
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());

  // Email
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sentEmails, setSentEmails] = useState<Set<string>>(new Set());

  // QR
  const joinUrl = `${window.location.origin}/join/${challengeId}`;

  const getAvatarSrc = (prof: Profile) => {
    if (prof.use_avatar && prof.avatar_url) return prof.avatar_url;
    if (prof.profile_photo_url) return prof.profile_photo_url;
    return "";
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const q = searchQuery.trim().toLowerCase();

    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, profile_photo_url, use_avatar, email")
      .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
      .neq("id", currentUserId)
      .limit(10);

    setSearchResults(data || []);
    setSearching(false);
  };

  const handleInviteUser = async (user: Profile) => {
    setInvitingUserId(user.id);

    // Check if already invited
    const { data: existing } = await supabase
      .from("invitations")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("recipient_user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      toast({ title: "Already invited", description: `${user.display_name} already has a pending invitation.` });
      setInvitingUserId(null);
      return;
    }

    const { error } = await supabase.from("invitations").insert({
      challenge_id: challengeId,
      sender_id: currentUserId,
      recipient_user_id: user.id,
      status: "pending",
    });

    if (error) {
      toast({ variant: "destructive", title: "Failed to invite", description: error.message });
    } else {
      toast({ title: "Invitation sent!", description: `${user.display_name} has been invited.` });
      setInvitedUserIds(prev => new Set(prev).add(user.id));
      onInviteSent();
    }
    setInvitingUserId(null);
  };

  const handleEmailInvite = async () => {
    if (!email.trim()) return;
    setSendingEmail(true);

    // Check if user exists with this email
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    const { error } = await supabase.from("invitations").insert({
      challenge_id: challengeId,
      sender_id: currentUserId,
      recipient_email: email.trim().toLowerCase(),
      recipient_user_id: existingUser?.id || null,
      status: "pending",
    });

    if (error) {
      toast({ variant: "destructive", title: "Failed to send invitation", description: error.message });
    } else {
      toast({ title: "Invitation created!", description: `Invitation sent to ${email}.` });
      setSentEmails(prev => new Set(prev).add(email.trim().toLowerCase()));
      setEmail("");
      onInviteSent();
    }
    setSendingEmail(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    toast({ title: "Link copied!", description: "Share this link to invite people." });
  };

  const isAlreadyParticipant = (userId: string) => existingParticipantIds.includes(userId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Participants</DialogTitle>
          <DialogDescription>Add people to this challenge</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="search" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="search" className="flex-1 gap-1 text-xs">
              <Search className="h-3.5 w-3.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="email" className="flex-1 gap-1 text-xs">
              <Mail className="h-3.5 w-3.5" /> Email
            </TabsTrigger>
            <TabsTrigger value="qr" className="flex-1 gap-1 text-xs">
              <QrCode className="h-3.5 w-3.5" /> QR Code
            </TabsTrigger>
          </TabsList>

          {/* Search existing users */}
          <TabsContent value="search" className="space-y-3 mt-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-9 text-sm"
              />
              <Button size="sm" onClick={handleSearch} disabled={searching} className="h-9">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <div className="max-h-[240px] overflow-y-auto space-y-2">
              {searchResults.length === 0 && searchQuery && !searching && (
                <p className="text-sm text-muted-foreground text-center py-4">No users found.</p>
              )}
              {searchResults.map((user) => {
                const alreadyIn = isAlreadyParticipant(user.id);
                const alreadyInvited = invitedUserIds.has(user.id);
                return (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={getAvatarSrc(user)} />
                      <AvatarFallback className="text-xs">{user.display_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    {alreadyIn ? (
                      <Badge variant="secondary" className="text-xs">Joined</Badge>
                    ) : alreadyInvited ? (
                      <Badge variant="outline" className="text-xs gap-1"><Check className="h-3 w-3" /> Invited</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={invitingUserId === user.id}
                        onClick={() => handleInviteUser(user)}
                      >
                        {invitingUserId === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Invite"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Email invitation */}
          <TabsContent value="email" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-sm">Email address</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailInvite()}
                  className="h-9 text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleEmailInvite}
                  disabled={sendingEmail || !email.trim()}
                  className="h-9"
                >
                  {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                </Button>
              </div>
            </div>
            {sentEmails.size > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Invitations sent:</p>
                {[...sentEmails].map((e) => (
                  <div key={e} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-green-500" />
                    {e}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* QR Code */}
          <TabsContent value="qr" className="mt-3">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-xl shadow-card">
                <QRCodeSVG value={joinUrl} size={180} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Scan to join this challenge
              </p>
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5">
                Copy invite link
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default InviteParticipants;
