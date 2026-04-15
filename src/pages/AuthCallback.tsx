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

      navigate("/", { replace: true });
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Signing in…</p>
    </div>
  );
};

export default AuthCallback;
