import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { trackEvent } from "@/hooks/useTrackEvent";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Globe } from "lucide-react";
import logo from "@/assets/logo.png";

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const pendingJoin = localStorage.getItem("pendingJoin");
        if (pendingJoin) {
          localStorage.removeItem("pendingJoin");
          navigate(pendingJoin);
        } else {
          navigate("/");
        }
      }
    });
  }, [navigate]);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language?.startsWith("fr") ? "en" : "fr");
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
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/profile-setup` } });
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
    } else {
      trackEvent("signup", { method: "email" });
      toast({ title: t("auth.accountCreated"), description: t("auth.completeProfile") });
      navigate("/profile-setup");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
        toast({ variant: "destructive", title: t("auth.loginFailed"), description: t("auth.invalidCredentials") });
      } else {
        toast({ variant: "destructive", title: t("auth.loginFailed"), description: error.message });
      }
    } else {
      navigate("/");
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
    const { error } = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth/callback` });
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: t("auth.signInFailed"), description: error.message });
    }
  };

  const SocialButtons = () => (
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
      <Button type="button" variant="outline" className="w-full gap-2" onClick={() => handleOAuth("apple")} disabled={loading}>
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
        {t("auth.continueApple")}
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
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
              <SocialButtons />
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t("auth.email")}</Label>
                  <Input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t("auth.password")}</Label>
                  <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
              <SocialButtons />
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t("auth.email")}</Label>
                  <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t("auth.password")}</Label>
                  <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
                  <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
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
