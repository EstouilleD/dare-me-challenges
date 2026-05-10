import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, ExternalLink, Trophy, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BrandCommunity {
  name: string;
  slug: string;
  logo_url: string | null;
  type: string;
  is_verified: boolean;
  banner_url: string | null;
  accent_color: string | null;
  reward_description: string | null;
  sponsor_cta_text: string | null;
  sponsor_cta_url: string | null;
}

interface BrandChallengeHeaderProps {
  community: BrandCommunity;
  challengeTitle: string;
  challengeIcon: string;
  challengeTypeName: string;
  status: string;
}

const BrandChallengeHeader = ({
  community,
  challengeTitle,
  challengeIcon,
  challengeTypeName,
  status,
}: BrandChallengeHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Campaign Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-elevated">
        {/* Banner image or gradient */}
        <div
          className="h-36 sm:h-44"
          style={{
            background: community.banner_url
              ? `url(${community.banner_url}) center/cover no-repeat`
              : `linear-gradient(135deg, ${community.accent_color || 'hsl(230,67%,46%)'} 0%, ${community.accent_color || 'hsl(230,67%,46%)'}88 50%, hsl(110,72%,77%) 100%)`,
          }}
        >
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        {/* Brand identity bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end gap-3">
            {/* Brand logo */}
            <button
              onClick={() => navigate(`/community/${community.slug}`)}
              className="shrink-0"
            >
              {community.logo_url ? (
                <img
                  src={community.logo_url}
                  alt={community.name}
                  className="h-14 w-14 rounded-xl object-cover border-2 border-white shadow-card"
                />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-white flex items-center justify-center shadow-card">
                  <span className="text-xl font-bold" style={{ color: community.accent_color || undefined }}>
                    {community.name[0]}
                  </span>
                </div>
              )}
            </button>

            {/* Challenge info */}
            <div className="flex-1 min-w-0 pb-0.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <button
                  onClick={() => navigate(`/community/${community.slug}`)}
                  className="text-white/90 text-xs font-medium hover:text-white transition-colors flex items-center gap-1"
                >
                  {community.name}
                  {community.is_verified && <BadgeCheck className="h-3 w-3" />}
                </button>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 bg-white/20 text-white border-white/30"
                >
                  Campaign
                </Badge>
              </div>
              <h2 className="text-white font-bold text-lg leading-tight truncate">
                {challengeIcon} {challengeTitle}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-white/70 text-xs">{challengeTypeName}</span>
                <Badge
                  variant={status === "active" ? "default" : "secondary"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Sponsor CTA floating pill */}
        {community.sponsor_cta_url && community.sponsor_cta_text && (
          <a
            href={community.sponsor_cta_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-semibold shadow-card hover:bg-white transition-colors"
            style={{ color: community.accent_color || undefined }}
          >
            {community.sponsor_cta_text}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Rewards card */}
      {community.reward_description && (
        <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Gift className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Rewards & Prizes
                  </p>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                  {community.reward_description}
                </p>
              </div>
            </div>
            {community.sponsor_cta_url && (
              <a
                href={community.sponsor_cta_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: community.accent_color || 'hsl(230,67%,46%)' }}
              >
                {community.sponsor_cta_text || "Learn more"}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BrandChallengeHeader;
