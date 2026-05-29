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

    // Check if session already exists (detectSessionInUrl:true may have already
    // processed the code before this effect runs)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) goNext(session);
    });

    // Also subscribe in case the exchange is still in progress
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        subscription.unsubscribe();
        goNext(session);
      }
    });

    // Bail out after 15 s so the user isn't stuck on the loading screen
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
