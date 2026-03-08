import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check, CheckCheck } from "lucide-react";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

const Notifications = () => {
  const navigate = useNavigate();
  const { headerClass } = useAutoHideHeader();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setNotifications(data || []);
    setLoading(false);

    // Mark all as read
    if (data && data.some(n => !n.is_read)) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false);
    }
  };

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = (notif: Notification) => {
    if (notif.data?.challenge_id) {
      navigate(`/challenge/${notif.data.challenge_id}`);
    } else if (notif.data?.proof_id) {
      navigate(`/proof/${notif.data.proof_id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold text-white">Notifications</h1>
            </div>
            <HeaderLogo />
            {notifications.some(n => !n.is_read) && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-white hover:bg-white/20 gap-1">
                <CheckCheck className="h-4 w-4" /> Mark all read
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-lg space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">🔔</p>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map(notif => (
            <Card
              key={notif.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                !notif.is_read ? "border-primary/30 bg-primary/5" : ""
              }`}
              onClick={() => handleNotificationClick(notif)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="text-2xl flex-shrink-0 mt-0.5">
                  {notif.title.split(" ")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!notif.is_read ? "font-semibold" : ""}`}>
                    {notif.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default Notifications;
