import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCheck } from "lucide-react";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import HeaderLogo from "@/components/HeaderLogo";
import { formatDistanceToNow } from "date-fns";
import { usePagination } from "@/hooks/usePagination";
import ShowMoreButton from "@/components/ShowMoreButton";
import { useToast } from "@/hooks/use-toast";

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
  const { t } = useTranslation();
  const { toast } = useToast();
  const { headerClass } = useAutoHideHeader();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioned, setActioned] = useState<Record<string, "accepted" | "declined">>({});
  const [userId, setUserId] = useState<string | null>(null);
  const { visibleItems, hasMore, showMore, totalCount, visibleCount } = usePagination(notifications, { pageSize: 15 });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    setUserId(session.user.id);

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    setNotifications(data || []);
    setLoading(false);

    if (data && data.some(n => !n.is_read)) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false);
    }
  };

  const markAllRead = async () => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleAcceptInvite = (notif: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    setActioned(prev => ({ ...prev, [notif.id]: "accepted" }));
    navigate(`/join/${notif.data.challenge_id}`);
  };

  const handleDeclineInvite = async (notif: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    await supabase
      .from("invitations")
      .update({ status: "declined" })
      .eq("challenge_id", notif.data.challenge_id)
      .eq("recipient_user_id", userId)
      .eq("status", "pending");
    setActioned(prev => ({ ...prev, [notif.id]: "declined" }));
    toast({ title: t("notifications.inviteDeclined") });
  };

  const handleNotificationClick = (notif: Notification) => {
    if (notif.type === "challenge_invite") return; // handled by buttons
    if (notif.data?.challenge_id) navigate(`/challenge/${notif.data.challenge_id}`);
    else if (notif.data?.proof_id) navigate(`/proof/${notif.data.proof_id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t("notifications.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-white">{t("notifications.title")}</h1>
            {notifications.some(n => !n.is_read) && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-white hover:bg-white/20 gap-1 ml-auto mr-2">
                <CheckCheck className="h-4 w-4" /> {t("notifications.markAllRead")}
              </Button>
            )}
            <HeaderLogo />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-lg space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">🔔</p>
            <p>{t("notifications.empty")}</p>
          </div>
        ) : (
          <>
            {visibleItems.map(notif => {
              const isInvite = notif.type === "challenge_invite";
              const inviteAction = actioned[notif.id];

              return (
                <Card
                  key={notif.id}
                  className={`transition-all ${
                    !notif.is_read ? "border-primary/30 bg-primary/5" : ""
                  } ${!isInvite ? "cursor-pointer hover:shadow-md" : ""}`}
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

                      {/* Accept / Decline buttons for challenge invites */}
                      {isInvite && !inviteAction && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={e => handleAcceptInvite(notif, e)}
                          >
                            {t("notifications.accept")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs"
                            onClick={e => handleDeclineInvite(notif, e)}
                          >
                            {t("notifications.decline")}
                          </Button>
                        </div>
                      )}

                      {/* Actioned state */}
                      {isInvite && inviteAction && (
                        <p className={`text-xs mt-2 font-medium ${inviteAction === "accepted" ? "text-primary" : "text-muted-foreground"}`}>
                          {inviteAction === "accepted" ? `✓ ${t("notifications.inviteAccepted")}` : `✗ ${t("notifications.inviteDeclined")}`}
                        </p>
                      )}
                    </div>
                    {!notif.is_read && (
                      <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {hasMore && <ShowMoreButton onClick={showMore} visibleCount={visibleCount} totalCount={totalCount} />}
          </>
        )}
      </main>
    </div>
  );
};

export default Notifications;
