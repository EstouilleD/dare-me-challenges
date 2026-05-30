import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import type { Session } from "@supabase/supabase-js";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const goNext = async (session: Session) => {
      if (!mounted) return;

      // Close the in-app browser on native (no-op on Android App Link since CCT
      // closes automatically, harmless on iOS).
      if (Capacitor.isNativePlatform()) {
        try { await Browser.close(); } catch {}
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url, profile_photo_url")
        .eq("id", session.user.id)
        .single();

      if (!mounted) return;
      navigate(
        !profile?.avatar_url && !profile?.profile_photo_url ? "/profile-setup" : "/",
        { replace: true }
      );
    };

    // On native, appUrlOpen navigates here via React Router (SPA navigation).
    // Supabase's detectSessionInUrl only fires on full page load, not SPA navigation,
    // so we must exchange the PKCE code manually.
    //
    // On web, the page fully reloads so detectSessionInUrl handles it automatically
    // and fires SIGNED_IN — we just wait for that event below.
    const code = new URLSearchParams(window.location.search).get("code");

    if (Capacitor.isNativePlatform() && code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!mounted) return;
        if (error || !data.session) {
          navigate("/auth", { replace: true });
        } else {
          goNext(data.session);
        }
      });
      return () => { mounted = false; };
    }

    // Web fallback: session may already exist (detectSessionInUrl ran) or
    // SIGNED_IN event is about to fire.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && mounted) goNext(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session && mounted) {
        subscription.unsubscribe();
        goNext(session);
      }
    });

    const timer = setTimeout(() => {
      if (mounted) {
        subscription.unsubscribe();
        navigate("/auth", { replace: true });
      }
    }, 15_000);

    return () => {
      mounted = false;
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
