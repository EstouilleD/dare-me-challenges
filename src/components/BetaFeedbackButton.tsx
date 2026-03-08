import { useState } from "react";
import { MessageSquarePlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const categories = [
  { value: "bug", label: "🐛 Bug Report" },
  { value: "feature", label: "💡 Feature Request" },
  { value: "ux", label: "🎨 UX / Design" },
  { value: "general", label: "💬 General Feedback" },
];

const BetaFeedbackButton = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in first", variant: "destructive" });
        return;
      }
      const { error } = await supabase.from("beta_feedback" as any).insert({
        user_id: user.id,
        category,
        message: message.trim(),
        page_url: window.location.pathname,
      } as any);
      if (error) throw error;
      toast({ title: "🙏 Thanks for your feedback!", description: "We'll review it soon." });
      setMessage("");
      setCategory("general");
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Error sending feedback", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 text-sm font-medium"
          aria-label="Send feedback"
        >
          <MessageSquarePlus className="h-5 w-5" />
          <span className="hidden sm:inline">Beta Feedback</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Beta Feedback
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Tell us what you think, report a bug, or suggest an improvement…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={2000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{message.length}/2000</span>
            <Button onClick={handleSubmit} disabled={!message.trim() || sending} size="sm">
              <Send className="h-4 w-4 mr-1" />
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BetaFeedbackButton;
