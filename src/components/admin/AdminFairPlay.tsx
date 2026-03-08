import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, Eye, CheckCircle, XCircle, Users, Zap, Camera } from "lucide-react";
import { format } from "date-fns";

interface Flag {
  id: string;
  user_id: string;
  flag_type: string;
  severity: string;
  details: any;
  challenge_id: string | null;
  is_resolved: boolean;
  created_at: string;
}

const FLAG_ICONS: Record<string, typeof AlertTriangle> = {
  reciprocal_voting: Users,
  mass_boost: Zap,
  rapid_proofs: Camera,
  duplicate_proof: Camera,
};

const FLAG_LABELS: Record<string, string> = {
  reciprocal_voting: "Reciprocal Voting",
  mass_boost: "Mass Boosting",
  rapid_proofs: "Rapid Proofs",
  duplicate_proof: "Duplicate Proof",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-destructive/10 text-destructive",
};

const AdminFairPlay = () => {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadFlags(); }, [showResolved]);

  const loadFlags = async () => {
    setLoading(true);
    let query = supabase
      .from("fair_play_flags" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!showResolved) {
      query = query.eq("is_resolved", false);
    }

    const { data } = await query;
    setFlags((data as any[]) || []);
    setLoading(false);
  };

  const handleResolve = async (flagId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("fair_play_flags" as any)
      .update({
        is_resolved: true,
        resolved_by: session.user.id,
        resolved_at: new Date().toISOString(),
      } as any)
      .eq("id", flagId);

    if (!error) {
      toast({ title: "Flag resolved" });
      loadFlags();
    }
  };

  if (loading) return <p className="text-muted-foreground py-4">Loading fair play data...</p>;

  const unresolvedCount = flags.filter(f => !f.is_resolved).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Fair Play Alerts</h3>
          {unresolvedCount > 0 && (
            <Badge variant="destructive" className="text-xs">{unresolvedCount} unresolved</Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowResolved(!showResolved)}
        >
          <Eye className="h-4 w-4 mr-1" />
          {showResolved ? "Hide Resolved" : "Show All"}
        </Button>
      </div>

      {flags.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No suspicious activity detected</p>
          </CardContent>
        </Card>
      )}

      {flags.map((flag) => {
        const Icon = FLAG_ICONS[flag.flag_type] || AlertTriangle;
        return (
          <Card key={flag.id} className={`shadow-card ${flag.is_resolved ? "opacity-60" : ""}`}>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${flag.severity === "high" ? "bg-destructive/10" : "bg-muted"}`}>
                  <Icon className={`h-5 w-5 ${flag.severity === "high" ? "text-destructive" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {FLAG_LABELS[flag.flag_type] || flag.flag_type}
                    </span>
                    <Badge className={`text-[10px] ${SEVERITY_COLORS[flag.severity]}`}>
                      {flag.severity}
                    </Badge>
                    {flag.is_resolved && (
                      <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-0.5" /> Resolved
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {flag.details?.description || "Suspicious pattern detected"}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span>User: {flag.user_id.slice(0, 8)}...</span>
                    <span>{format(new Date(flag.created_at), "MMM d, h:mm a")}</span>
                    {flag.details?.reverse_vote_count && (
                      <span>Reverse votes: {flag.details.reverse_vote_count}</span>
                    )}
                    {flag.details?.boost_count_24h && (
                      <span>Boosts in 24h: {flag.details.boost_count_24h}</span>
                    )}
                    {flag.details?.proofs_in_5min && (
                      <span>Proofs in 5min: {flag.details.proofs_in_5min}</span>
                    )}
                  </div>
                </div>
                {!flag.is_resolved && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolve(flag.id)}
                    className="shrink-0"
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Resolve
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminFairPlay;
