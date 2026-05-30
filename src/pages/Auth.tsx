import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { trackEvent } from "@/hooks/useTrackEvent";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Globe, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App as CapacitorApp } from "@capacitor/app";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  show: boolean;
  onToggle: () => void;
  minLength?: number;
}

const PasswordInput = ({ id, value, onChange, show, onToggle, minLength }: PasswordInputProps) => (
  <div className="relative">
    <Input
      id={id}
      type={show ? "text" : "password"}
      value={value}
      onChange={onChange}
      required
      minLength={minLength}
      className="pr-10"
    />
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  </div>
);

const Auth = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [activeTab, setActiveTab] = useState("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const pendingJoin = localStorage.getItem("pendingJoin");
        if (pendingJoin) {
          localStorage.removeItem("pendingJoin");
          navigate(pendingJoin, { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      }
    });
  }, [navigate]);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language?.startsWith("fr") ? "en" : "fr");
  };

  const navigateAfterAuth = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url, profile_photo_url")
      .eq("id", userId)
      .single();
    if (!profile?.avatar_url && !profile?.profile_photo_url) {
      navigate("/profile-setup", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: t("auth.passwordsDontMatch"), description: t("auth.passwordsDontMatchDesc") });
      return;
    }
    if (password.length < 6) {
      toast({ variant: "destructive", title: t("auth.passwordTooShort"), description: t("auth.passwordTooShortDesc") });
      return;
    }

    setLoading(true);
    const redirectTo = Capacitor.isNativePlatform()
      ? "com.dareme.challenges://auth/callback"
      : `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already exists")) {
        toast({ variant: "destructive", title: t("auth.accountExists"), description: t("auth.accountExistsDesc") });
        setActiveTab("login");
        return;
      }
      toast({ variant: "destructive", title: t("auth.signupFailed"), description: error.message });
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      toast({ variant: "destructive", title: t("auth.accountExists"), description: t("auth.accountExistsDesc") });
      setActiveTab("login");
    } else if (data.session) {
      trackEvent("signup", { method: "email" });
      toast({ title: t("auth.accountCreated"), description: t("auth.completeProfile") });
      await navigateAfterAuth(data.session.user.id);
    } else {
      // No session yet — email confirmation is required before they can sign in.
      // Do NOT navigate away; stay on auth so the session check in ProfileSetup
      // doesn't immediately bounce them back here.
      toast({ title: t("auth.accountCreated"), description: t("auth.completeProfile") });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
        toast({ variant: "destructive", title: t("auth.loginFailed"), description: t("auth.invalidCredentials") });
      } else {
        toast({ variant: "destructive", title: t("auth.loginFailed"), description: error.message });
      }
    } else if (data.session) {
      await navigateAfterAuth(data.session.user.id);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);

    if (error) {
      toast({ variant: "destructive", title: t("auth.resetFailed"), description: error.message });
    } else {
      toast({ title: t("auth.checkEmail"), description: t("auth.resetLinkSent") });
      setShowForgotPassword(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);

    if (Capacitor.isNativePlatform()) {
      // Android uses the HTTPS App Link URL so Chrome CCT dispatches it correctly.
      // Chrome blocks custom-scheme redirects from server-side 302s (Chrome 80+),
      // but always allows HTTPS redirects which Android App Links then intercept.
      // iOS keeps the custom scheme which works fine with Safari.
      // Android: use HTTPS so Chrome CCT allows the server-side redirect.
      // The AuthCallback web page exchanges the code and then does a JS navigation
      // to com.dareme.challenges://auth/session?tokens — Chrome allows JS-initiated
      // custom scheme navigations in CCT, which triggers appUrlOpen in the app.
      // iOS: keep the custom scheme which works fine with Safari.
      const redirectUrl = Capacitor.getPlatform() === "android"
        ? "https://friend-dare-game.lovable.app/auth/callback?source=android"
        : "com.dareme.challenges://auth/callback";

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });

      if (error || !data?.url) {
        setLoading(false);
        if (error) toast({ variant: "destructive", title: t("auth.signInFailed"), description: error.message });
        return;
      }

      let handled = false;

      // Cleans up all listeners. Safe to call multiple times.
      const cleanup = () => {
        handled = true;
        authSub?.unsubscribe();
        try { appUrlListenerRef?.remove(); } catch {}
        try { browserFinishedRef?.remove(); } catch {}
      };

      const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("[OAuth] onAuthStateChange:", event, session?.user?.email ?? "no-session", "handled:", handled);
        toast({ title: `🔔 authState: ${event}`, description: session?.user?.email ?? "no session" });
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session && !handled) {
          cleanup();
          try { await Browser.close(); } catch {}
          setLoading(false);
          await navigateAfterAuth(session.user.id);
        }
      });

      // These refs are assigned below; closures capture by reference so it's safe.
      let appUrlListenerRef: { remove: () => void } | null = null;
      let browserFinishedRef: { remove: () => void } | null = null;

      appUrlListenerRef = await CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
        console.log("[OAuth] appUrlOpen fired:", url);
        toast({ title: "🔗 appUrlOpen fired", description: url.substring(0, 80) });

        try {
          const parsed = new URL(url);
          const code = parsed.searchParams.get("code");
          const errorParam = parsed.searchParams.get("error");
          // Android flow: tokens passed as query params from web AuthCallback
          const queryAccessToken = parsed.searchParams.get("access_token");
          const queryRefreshToken = parsed.searchParams.get("refresh_token");
          // Legacy implicit flow: tokens in hash fragment
          const hashParams = new URLSearchParams(parsed.hash.substring(1));
          const hashAccessToken = hashParams.get("access_token");
          const hashRefreshToken = hashParams.get("refresh_token");

          console.log("[OAuth] url parsed — code:", !!code, "error:", errorParam, "queryTokens:", !!queryAccessToken, "hashTokens:", !!hashAccessToken);
          toast({ title: "🔍 URL parsed", description: `code=${!!code} qToken=${!!queryAccessToken} error=${errorParam ?? "none"}` });

          if (errorParam) {
            cleanup();
            setLoading(false);
            toast({ variant: "destructive", title: "OAuth provider error", description: errorParam });
            return;
          }

          if (code) {
            // Direct PKCE code exchange (custom scheme or non-Android flow)
            console.log("[OAuth] calling exchangeCodeForSession");
            toast({ title: "🔑 Calling exchangeCodeForSession…" });
            const { data: exchData, error: exchError } = await supabase.auth.exchangeCodeForSession(url);
            console.log("[OAuth] exchange result — user:", exchData?.session?.user?.email ?? "none", "error:", exchError?.message ?? "none");
            toast({ title: exchError ? "❌ Exchange failed" : "✅ Exchange OK", description: exchError?.message ?? exchData?.session?.user?.email ?? "no session in response" });

            if (exchError) {
              cleanup();
              setLoading(false);
              toast({ variant: "destructive", title: t("auth.signInFailed"), description: exchError.message });
              return;
            }

            if (exchData?.session && !handled) {
              console.log("[OAuth] navigating from exchData.session");
              cleanup();
              try { await Browser.close(); } catch {}
              setLoading(false);
              await navigateAfterAuth(exchData.session.user.id);
              return;
            }

          } else if (queryAccessToken && queryRefreshToken) {
            // Android flow: web AuthCallback exchanged the code and passed tokens
            // back via JS navigation to com.dareme.challenges://auth/session?tokens
            console.log("[OAuth] setSession from query params (Android web-callback flow)");
            toast({ title: "🔑 setSession from web callback…" });
            const { data: setData, error: setError } = await supabase.auth.setSession({ access_token: queryAccessToken, refresh_token: queryRefreshToken });
            console.log("[OAuth] setSession — user:", setData?.session?.user?.email ?? "none", "error:", setError?.message ?? "none");
            toast({ title: setError ? "❌ setSession failed" : "✅ setSession OK", description: setError?.message ?? setData?.session?.user?.email ?? "no session" });

            if (setError) {
              cleanup();
              setLoading(false);
              toast({ variant: "destructive", title: t("auth.signInFailed"), description: setError.message });
              return;
            }

            if (setData?.session && !handled) {
              cleanup();
              try { await Browser.close(); } catch {}
              setLoading(false);
              await navigateAfterAuth(setData.session.user.id);
              return;
            }

          } else if (hashAccessToken && hashRefreshToken) {
            // Legacy implicit flow
            console.log("[OAuth] setSession from hash params (implicit flow)");
            const { data: setData, error: setError } = await supabase.auth.setSession({ access_token: hashAccessToken, refresh_token: hashRefreshToken });
            console.log("[OAuth] setSession — user:", setData?.session?.user?.email ?? "none", "error:", setError?.message ?? "none");
            toast({ title: setError ? "❌ setSession failed" : "✅ setSession OK", description: setError?.message ?? setData?.session?.user?.email ?? "no session" });

            if (setError) {
              cleanup();
              setLoading(false);
              toast({ variant: "destructive", title: t("auth.signInFailed"), description: setError.message });
              return;
            }

            if (setData?.session && !handled) {
              cleanup();
              try { await Browser.close(); } catch {}
              setLoading(false);
              await navigateAfterAuth(setData.session.user.id);
              return;
            }

          } else {
            console.log("[OAuth] appUrlOpen: no code, no tokens in URL");
            toast({ variant: "destructive", title: "⚠️ No code or tokens in URL" });
            cleanup();
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("[OAuth] URL parse/exchange error:", e);
          toast({ variant: "destructive", title: "OAuth error", description: String(e) });
          cleanup();
          setLoading(false);
          return;
        }

        // Final fallback: onAuthStateChange should have already navigated,
        // but double-check with getSession in case it fired before our listener.
        if (!handled) {
          const { data: { session } } = await supabase.auth.getSession();
          console.log("[OAuth] getSession fallback:", session?.user?.email ?? "no session");
          toast({ title: "🔄 getSession fallback", description: session?.user?.email ?? "no session — resetting" });
          if (session) {
            cleanup();
            try { await Browser.close(); } catch {}
            setLoading(false);
            await navigateAfterAuth(session.user.id);
          } else {
            cleanup();
            setLoading(false);
          }
        }
      });

      // Safety net: if the browser closes without the deep link firing (user pressed
      // back, or App Link not verified), unblock the UI after a grace period.
      browserFinishedRef = await Browser.addListener("browserFinished", () => {
        console.log("[OAuth] browserFinished fired, handled:", handled);
        toast({ title: "🌐 Browser closed", description: `handled=${handled}` });
        setTimeout(() => {
          if (!handled) {
            console.log("[OAuth] browserFinished timeout — resetting (deep link never fired)");
            cleanup();
            setLoading(false);
            toast({ variant: "destructive", title: "Sign-in incomplete", description: "Deep link not received — App Link may not be verified yet." });
          }
        }, 4000);
      });

      await Browser.open({ url: data.url });
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (error) {
        toast({ variant: "destructive", title: t("auth.signInFailed"), description: error.message });
      }
    }
  };

  const socialButtons = (
    <div className="space-y-3">
      <Button type="button" variant="outline" className="w-full gap-2" onClick={() => handleOAuth("google")} disabled={loading}>
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {t("auth.continueGoogle")}
      </Button>
      <div className="relative my-4">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
          {t("common.or")}
        </span>
      </div>
    </div>
  );

  return (
    <div className="safe-top safe-bottom min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center space-y-2">
          <img src={logo} alt="Dare Me" className="h-20 mx-auto" />
          <CardDescription>{t("auth.tagline")}</CardDescription>
          <button
            onClick={toggleLang}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            <Globe className="h-3.5 w-3.5" />
            {i18n.language?.startsWith("fr") ? "English" : "Français"}
          </button>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {socialButtons}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t("auth.email")}</Label>
                  <Input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t("auth.password")}</Label>
                  <PasswordInput
                    id="login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    show={showLoginPassword}
                    onToggle={() => setShowLoginPassword((v) => !v)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.loggingIn") : t("auth.loginButton")}
                </Button>
                <button type="button" onClick={() => setShowForgotPassword(true)} className="w-full text-sm text-muted-foreground hover:text-primary underline mt-2">
                  {t("auth.forgotPassword")}
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              {socialButtons}
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t("auth.email")}</Label>
                  <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t("auth.password")}</Label>
                  <PasswordInput
                    id="signup-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    show={showSignupPassword}
                    onToggle={() => setShowSignupPassword((v) => !v)}
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
                  <PasswordInput
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    show={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((v) => !v)}
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("auth.resetTitle")}</DialogTitle>
            <DialogDescription>{t("auth.resetDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">{t("auth.email")}</Label>
              <Input id="reset-email" type="email" placeholder="you@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.sending") : t("auth.sendResetLink")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
