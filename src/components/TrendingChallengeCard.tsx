import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { getAvatarSrc } from "@/lib/avatars";

interface TrendingChallenge {
  id: string;
  title: string;
  description: string;
  status: string;
  type_icon: string;
  type_name: string;
  category_name: string | null;
  category_icon: string | null;
  owner_name: string;
  owner_avatar_url: string | null;
  owner_photo_url: string | null;
  owner_use_avatar: boolean;
  community_name: string | null;
  participant_count: number;
  trending_score: number;
}

export const TrendingChallengeCard = ({ challenge }: { challenge: TrendingChallenge }) => {
  const navigate = useNavigate();

  const profile = {
    avatar_url: challenge.owner_avatar_url,
    profile_photo_url: challenge.owner_photo_url,
    use_avatar: challenge.owner_use_avatar,
  };

  return (
    <Card
      className="min-w-[260px] max-w-[280px] shrink-0 cursor-pointer hover:shadow-elevated transition-all hover:scale-[1.02] snap-start"
      onClick={() => navigate(`/challenge/${challenge.id}`)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <span className="text-2xl">{challenge.type_icon}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{challenge.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{challenge.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={challenge.status === "active" ? "default" : "secondary"} className="text-[10px]">
            {challenge.status}
          </Badge>
          {challenge.category_name && (
            <Badge variant="outline" className="text-[10px]">
              {challenge.category_icon} {challenge.category_name}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={getAvatarSrc(profile as any)} />
              <AvatarFallback className="text-[10px]">{challenge.owner_name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">{challenge.owner_name}</span>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <Users className="h-3 w-3" /> {challenge.participant_count}
          </span>
        </div>

        {challenge.community_name && (
          <div className="flex items-center gap-1 text-primary">
            <Users className="h-3 w-3" />
            <span className="text-[10px] font-medium truncate">{challenge.community_name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
