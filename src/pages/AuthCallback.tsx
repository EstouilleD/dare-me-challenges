import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import type { Session } from "@supabase/supabase-js";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let done = false;

    const goNext = async (session: Session) => {
      if (done) return;
      done = true;

      // Android native: server-side redirects to custom schemes are blocked by
      // Chrome CCT (Chrome 80+), but JS-initiated navigations to custom schemes
      // ARE allowed. So we redirect here via JS, passing tokens in the URL for
      // the app to pick up via appUrlOpen → setSession.
      const callbackUrl = new URL(window.location.href);
      if (callbackUrl.searchParams.get("source") === "android") {
        window.location.href =
          `com.dareme.challenges://auth/session` +
          `?access_token=${encodeURIComponent(session.access_token)}` +
          `&refresh_token=${encodeURIComponent(session.refresh_token)}`;
        return;
      }

      // Web / iOS flow
      if (Capacitor.isNativePlatform()) {
        try { await Browser.close(); } catch { /* already closed */ }
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url, profile_photo_url")
        .eq("id", session.user.id)
        .single();

      if (!profile?.avatar_url && !profile?.profile_photo_url) {
        navigate("/profile-setup", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    };

    // detectSessionInUrl:true may have already exchanged the code before this
    // effect runs — check immediately.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) goNext(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        subscription.unsubscribe();
        goNext(session);
      }
    });

    const timer = setTimeout(() => {
      if (!done) {
        subscription.unsubscribe();
        navigate("/auth", { replace: true });
      }
    }, 15_000);

    return () => {
      done = true;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="safe-top min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Signing in…</p>
    </div>
  );
};

export default AuthCallback;
