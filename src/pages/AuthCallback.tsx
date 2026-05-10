import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Try exchanging code from URL (PKCE flow)
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            console.error("OAuth callback error:", error.message);
          }
        } else {
          // Hash fragment flow (implicit) — Supabase auto-detects tokens in hash
          const { error } = await supabase.auth.getSession();
          if (error) {
            console.error("OAuth session error:", error.message);
          }
        }
      } catch (err) {
        console.error("OAuth callback exception:", err);
      }

      // Close the system browser if running on native
      if (Capacitor.isNativePlatform()) {
        try {
          await Browser.close();
        } catch {
          // Browser might already be closed
        }
      }

      const { data: { session: finalSession } } = await supabase.auth.getSession();
      if (finalSession) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url, profile_photo_url")
          .eq("id", finalSession.user.id)
          .single();
        if (!profile?.avatar_url && !profile?.profile_photo_url) {
          navigate("/profile-setup", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } else {
        navigate("/auth", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="safe-top min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Signing in…</p>
    </div>
  );
};

export default AuthCallback;
