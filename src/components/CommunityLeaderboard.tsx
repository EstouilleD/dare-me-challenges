import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Target, Star, Flame } from "lucide-react";
import { getAvatarSrc } from "@/lib/avatars";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  use_avatar: boolean;
  total_points: number;
  challenges_completed: number;
  challenges_won: number;
  proofs_submitted: number;
  honor_votes: number;
}

interface CommunityLeaderboardProps {
  communityId: string;
  currentUserId: string | null;
}

const getMedalEmoji = (index: number) => {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return null;
};

const SCORING_RULES = [
  { icon: "🏆", label: "Challenge won", points: "+25" },
  { icon: "✅", label: "Challenge completed", points: "+10" },
  { icon: "⭐", label: "Honor vote received", points: "+5" },
  { icon: "📸", label: "Proof submitted", points: "+2" },
];

const CommunityLeaderboard = ({ communityId, currentUserId }: CommunityLeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [communityId]);

  const loadLeaderboard = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_community_leaderboard", {
      _community_id: communityId,
    });
    if (!error && data) {
      setLeaderboard(data as LeaderboardEntry[]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-sm">Loading rankings...</p>
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-12 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-semibold">No rankings yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Rankings appear once members participate in community challenges
          </p>
        </CardContent>
      </Card>
    );
  }

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const myRank = leaderboard.findIndex((e) => e.user_id === currentUserId);

  return (
    <div className="space-y-4">
      {/* Podium for top 3 */}
      {topThree.length > 0 && (
        <Card className="shadow-elevated border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4 py-4">
              {/* 2nd place */}
              {topThree[1] && (
                <div className="flex flex-col items-center text-center order-1 w-24">
                  <span className="text-2xl mb-1">🥈</span>
                  <Avatar className="h-14 w-14 ring-2 ring-muted-foreground/30">
                    <AvatarImage src={getAvatarSrc(topThree[1])} />
                    <AvatarFallback>{topThree[1].display_name[0]}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-medium mt-1.5 truncate w-full">{topThree[1].display_name}</p>
                  <Badge variant="secondary" className="text-[10px] mt-1">{topThree[1].total_points} pts</Badge>
                </div>
              )}
              {/* 1st place */}
              {topThree[0] && (
                <div className="flex flex-col items-center text-center order-2 w-28 -mt-4">
                  <span className="text-3xl mb-1">🥇</span>
                  <Avatar className="h-18 w-18 ring-2 ring-primary shadow-elevated" style={{ width: 72, height: 72 }}>
                    <AvatarImage src={getAvatarSrc(topThree[0])} />
                    <AvatarFallback className="text-lg">{topThree[0].display_name[0]}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-bold mt-1.5 truncate w-full">{topThree[0].display_name}</p>
                  <Badge className="text-[10px] mt-1 bg-primary">{topThree[0].total_points} pts</Badge>
                </div>
              )}
              {/* 3rd place */}
              {topThree[2] && (
                <div className="flex flex-col items-center text-center order-3 w-24">
                  <span className="text-2xl mb-1">🥉</span>
                  <Avatar className="h-14 w-14 ring-2 ring-muted-foreground/20">
                    <AvatarImage src={getAvatarSrc(topThree[2])} />
                    <AvatarFallback>{topThree[2].display_name[0]}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-medium mt-1.5 truncate w-full">{topThree[2].display_name}</p>
                  <Badge variant="secondary" className="text-[10px] mt-1">{topThree[2].total_points} pts</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My rank highlight */}
      {myRank >= 3 && currentUserId && (
        <Card className="shadow-card border-primary/30 bg-primary/5">
          <CardContent className="p-3 flex items-center gap-3">
            <span className="w-8 text-center font-bold text-sm text-primary">#{myRank + 1}</span>
            <Avatar className="h-8 w-8">
              <AvatarImage src={getAvatarSrc(leaderboard[myRank])} />
              <AvatarFallback>{leaderboard[myRank].display_name[0]}</AvatarFallback>
            </Avatar>
            <span className="flex-1 text-sm font-medium truncate">You</span>
            <Badge variant="outline" className="text-xs">{leaderboard[myRank].total_points} pts</Badge>
          </CardContent>
        </Card>
      )}

      {/* Full list */}
      {rest.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="p-2 divide-y divide-border">
            {rest.map((entry, idx) => {
              const rank = idx + 4;
              const isMe = entry.user_id === currentUserId;
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg ${isMe ? "bg-primary/5" : ""}`}
                >
                  <span className="w-8 text-center font-bold text-sm text-muted-foreground">#{rank}</span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getAvatarSrc(entry)} />
                    <AvatarFallback className="text-xs">{entry.display_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.display_name}{isMe && " (You)"}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {entry.challenges_won > 0 && <span>🏆 {entry.challenges_won}</span>}
                      {entry.challenges_completed > 0 && <span>✅ {entry.challenges_completed}</span>}
                      {entry.honor_votes > 0 && <span>⭐ {entry.honor_votes}</span>}
                      {entry.proofs_submitted > 0 && <span>📸 {entry.proofs_submitted}</span>}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{entry.total_points} pts</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Scoring rules */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">How points are earned</p>
          <div className="grid grid-cols-2 gap-2">
            {SCORING_RULES.map((rule) => (
              <div key={rule.label} className="flex items-center gap-2 text-sm">
                <span>{rule.icon}</span>
                <span className="text-muted-foreground text-xs">{rule.label}</span>
                <span className="font-semibold text-xs text-primary ml-auto">{rule.points}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommunityLeaderboard;
