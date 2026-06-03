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

    const code = new URLSearchParams(window.location.search).get("code");

    // ── App Link fallback (Android only) ────────────────────────────────────
    // When the HTTPS App Link is not yet verified by Android, Chrome CCT loads
    // this web page instead of opening the native app. The PKCE code_verifier
    // is in the native WebView's localStorage, not in this browser context.
    //
    // Fix: redirect back to the native app via a JS-initiated custom scheme URL.
    // JS-initiated redirects to custom schemes ARE allowed by Chrome; server-side
    // 302 redirects to custom schemes are NOT (Chrome 80+).
    //
    // Detection: not inside Capacitor + Android User-Agent + code in URL.
    if (
      !Capacitor.isNativePlatform() &&
      /android/i.test(navigator.userAgent) &&
      code
    ) {
      window.location.replace(
        `com.dareme.challenges://auth/callback?code=${encodeURIComponent(code)}`
      );
      return;
    }

    const goNext = async (session: Session) => {
      if (!mounted) return;

      if (Capacitor.isNativePlatform()) {
        try { await Browser.close(); } catch {}
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .single();

      if (!mounted) return;
      navigate(
        profile?.onboarding_completed ? "/" : "/profile-setup",
        { replace: true }
      );
    };

    // ── Native: explicit PKCE code exchange ──────────────────────────────────
    // appUrlOpen navigated here via React Router (SPA navigation).
    // detectSessionInUrl only fires on full page loads, not SPA navigation,
    // so we must exchange the code manually.
    if (Capacitor.isNativePlatform() && code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!mounted) return;
        if (error || !data.session) {
          console.error("[AuthCallback] exchangeCodeForSession failed:", error);
          navigate("/auth", { replace: true });
        } else {
          goNext(data.session);
        }
      });
      return () => { mounted = false; };
    }

    // ── Web: detectSessionInUrl handled the exchange automatically ───────────
    // Check if a session already exists (detectSessionInUrl may have completed)
    // or wait for the SIGNED_IN event.
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

  const isMobileWeb = !Capacitor.isNativePlatform() && /android|iphone|ipad/i.test(navigator.userAgent);

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
      padding: "24px",
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
      <p style={{ color: "#ccc", fontSize: "16px", fontWeight: 600, margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {isMobileWeb ? "Returning to the app…" : "Signing in…"}
      </p>
      {isMobileWeb && (
        <p style={{ color: "#555", fontSize: "13px", margin: 0, fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
          If the app doesn't open automatically, please return to it manually.
        </p>
      )}
    </div>
  );
};

export default AuthCallback;
