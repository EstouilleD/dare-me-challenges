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

      // Android native: Chrome CCT blocks server-side custom-scheme redirects
      // (Chrome 80+) but allows JS-initiated ones. Pass tokens via JS navigation
      // so the app picks them up in appUrlOpen → setSession.
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
    <div style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f0f0f",
      gap: "16px",
    }}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        style={{ animation: "spin 0.9s linear infinite" }}
      >
        <circle cx="20" cy="20" r="17" stroke="#333" strokeWidth="4" />
        <path
          d="M20 3 A17 17 0 0 1 37 20"
          stroke="#6366f1"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: "#888", fontSize: "14px", margin: 0, fontFamily: "system-ui, sans-serif" }}>
        Signing in…
      </p>
    </div>
  );
};

export default AuthCallback;
