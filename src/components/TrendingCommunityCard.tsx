import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Globe, Lock, BadgeCheck } from "lucide-react";

interface TrendingCommunity {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  category: string;
  logo_url: string | null;
  is_verified: boolean;
  member_count: number;
  trending_score: number;
}

const TYPE_ICON: Record<string, typeof Globe> = { public: Globe, private: Lock, brand: BadgeCheck };

export const TrendingCommunityCard = ({ community }: { community: TrendingCommunity }) => {
  const navigate = useNavigate();
  const Icon = TYPE_ICON[community.type] || Globe;

  return (
    <Card
      className="min-w-[220px] max-w-[240px] shrink-0 cursor-pointer hover:shadow-elevated transition-all hover:scale-[1.02] snap-start"
      onClick={() => navigate(`/community/${community.slug}`)}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          {community.logo_url ? (
            <img src={community.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{community.name[0]}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="font-semibold text-sm truncate">{community.name}</p>
              {community.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">{community.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] capitalize">
            <Icon className="h-2.5 w-2.5 mr-0.5" />{community.type}
          </Badge>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Users className="h-2.5 w-2.5" /> {community.member_count}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
