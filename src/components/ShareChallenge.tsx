import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Share2, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface ShareChallengeProps {
  challengeId: string;
  challengeTitle: string;
  trigger?: React.ReactNode;
}

const ShareChallenge = ({ challengeId, challengeTitle, trigger }: ShareChallengeProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/join/${challengeId}`;

  const trackShare = async (platform: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("challenge_shares").insert({
        challenge_id: challengeId,
        user_id: session.user.id,
        platform,
      });
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    trackShare("link");
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join: ${challengeTitle}`,
          text: `I challenge you! Join "${challengeTitle}" on Dare Me 🔥`,
          url: shareUrl,
        });
        trackShare("native");
      } catch {}
    }
  };

  const handleWhatsApp = () => {
    trackShare("whatsapp");
    window.open(`https://wa.me/?text=${encodeURIComponent(`Join my challenge "${challengeTitle}" 🔥 ${shareUrl}`)}`, "_blank");
  };

  const handleTwitter = () => {
    trackShare("twitter");
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I challenge you! Join "${challengeTitle}" on Dare Me 🔥`)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Share2 className="h-4 w-4" /> Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share Challenge</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            <QRCodeSVG value={shareUrl} size={160} />
          </div>

          <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent text-xs text-muted-foreground outline-none"
            />
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {navigator.share && (
              <Button variant="outline" onClick={handleNativeShare} className="col-span-2">
                <Share2 className="h-4 w-4 mr-2" /> Share via...
              </Button>
            )}
            <Button variant="outline" onClick={handleWhatsApp} className="text-sm">
              💬 WhatsApp
            </Button>
            <Button variant="outline" onClick={handleTwitter} className="text-sm">
              🐦 Twitter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareChallenge;
