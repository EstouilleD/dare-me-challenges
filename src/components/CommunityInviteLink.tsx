import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Link, Copy, Check, Plus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface CommunityInviteLinkProps {
  communityId: string;
  communityName: string;
}

interface InviteLink {
  id: string;
  code: string;
  uses: number;
  max_uses: number | null;
  is_active: boolean;
  created_at: string;
}

const CommunityInviteLink = ({ communityId, communityName }: CommunityInviteLinkProps) => {
  const { toast } = useToast();
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLinks();
  }, [communityId]);

  const loadLinks = async () => {
    const { data } = await supabase
      .from("community_invite_links")
      .select("*")
      .eq("community_id", communityId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setLinks(data || []);
  };

  const createLink = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("community_invite_links").insert({
      community_id: communityId,
      created_by: session.user.id,
    });

    if (error) {
      toast({ variant: "destructive", title: "Error creating link", description: error.message });
    } else {
      await loadLinks();
      toast({ title: "Invite link created!" });
    }
    setLoading(false);
  };

  const handleCopy = async (code: string) => {
    const url = `${window.location.origin}/community/join/${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(code);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(null), 2000);
  };

  const activeLink = links[0];
  const inviteUrl = activeLink ? `${window.location.origin}/community/join/${activeLink.code}` : "";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Link className="h-4 w-4" /> Invite Link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite to {communityName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {activeLink ? (
            <>
              <div className="flex justify-center">
                <QRCodeSVG value={inviteUrl} size={160} />
              </div>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="flex-1 bg-transparent text-xs text-muted-foreground outline-none"
                />
                <Button variant="ghost" size="sm" onClick={() => handleCopy(activeLink.code)}>
                  {copied === activeLink.code ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {activeLink.uses} uses {activeLink.max_uses ? `/ ${activeLink.max_uses} max` : ""}
              </p>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">No invite links yet</p>
              <Button onClick={createLink} disabled={loading} className="gap-1.5">
                <Plus className="h-4 w-4" /> Create Invite Link
              </Button>
            </div>
          )}

          {activeLink && (
            <Button variant="outline" onClick={createLink} disabled={loading} className="w-full gap-1.5">
              <Plus className="h-4 w-4" /> Create New Link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommunityInviteLink;
