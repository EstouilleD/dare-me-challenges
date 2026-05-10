import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";

interface PremiumBannerProps {
  title?: string;
  description?: string;
  compact?: boolean;
}

const PremiumBanner = ({ title = "Premium Feature", description = "Upgrade to Premium for unlimited access.", compact = false }: PremiumBannerProps) => {
  const navigate = useNavigate();

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
        <Lock className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <span className="text-xs text-muted-foreground flex-1">{title}</span>
        <Button size="sm" variant="default" className="h-6 text-xs gap-1 px-2" onClick={() => navigate("/store")}>
          <Crown className="h-3 w-3" /> Upgrade
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-center space-y-2">
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <Crown className="h-4 w-4 text-primary" />
        {title}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <Button size="sm" variant="default" className="gap-1" onClick={() => navigate("/store")}>
        <Crown className="h-3 w-3" /> Go Premium
      </Button>
    </div>
  );
};

export const PremiumLock = () => (
  <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
    <Crown className="h-3 w-3" /> Premium
  </span>
);

export default PremiumBanner;
