import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Report {
  id: string;
  reason: string;
  details: string | null;
  created_at: string;
  reporter_id: string;
  challenge_id: string;
  challenges: {
    id: string;
    title: string;
    status: string;
    owner_id: string;
    created_at: string;
    profiles: { display_name: string; email: string };
  };
  reporter: { display_name: string; email: string };
}

const AdminReports = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reports")
      .select(`
        *,
        challenges!inner(id, title, status, owner_id, created_at,
          profiles!challenges_owner_id_fkey(display_name, email)
        ),
        reporter:profiles!reports_reporter_id_fkey(display_name, email)
      `)
      .order("created_at", { ascending: false });

    setReports((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { loadReports(); }, []);

  const handleAction = async (report: Report, action: string) => {
    if (action === "no_action") {
      await supabase.from("challenges").update({ status: "active" }).eq("id", report.challenge_id);
      toast({ title: "Marked as no action needed" });
    } else if (action === "under_review") {
      await supabase.from("challenges").update({ status: "under_review" }).eq("id", report.challenge_id);
      toast({ title: "Kept under review" });
    } else if (action === "remove") {
      await supabase.from("challenges").update({ status: "removed" }).eq("id", report.challenge_id);
      toast({ title: "Content removed" });
    } else if (action === "ban") {
      await supabase.from("profiles").update({ account_status: "banned" }).eq("id", report.challenges.owner_id);
      await supabase.from("challenges").update({ status: "removed" }).eq("id", report.challenge_id);
      toast({ title: "User banned & content removed" });
    }
    loadReports();
  };

  if (loading) return <p className="text-muted-foreground">Loading reports...</p>;

  if (reports.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center text-muted-foreground">
          No reports found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((r) => (
        <Card key={r.id} className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{r.challenges.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Created by <span className="font-medium">{r.challenges.profiles.display_name}</span> on {format(new Date(r.challenges.created_at), "MMM d, yyyy")}
                </p>
              </div>
              <Badge variant={r.challenges.status === "under_review" ? "destructive" : r.challenges.status === "removed" ? "secondary" : "default"}>
                {r.challenges.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Category:</span>{" "}
                <span className="font-medium">{r.reason}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Reported by:</span>{" "}
                <span className="font-medium">{r.reporter.display_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Report date:</span>{" "}
                <span className="font-medium">{format(new Date(r.created_at), "MMM d, yyyy HH:mm")}</span>
              </div>
            </div>
            {r.details && (
              <div className="text-sm bg-muted/50 p-3 rounded-lg">
                <span className="text-muted-foreground">Details:</span> {r.details}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => handleAction(r, "no_action")}>
                No Action
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleAction(r, "under_review")}>
                Keep Under Review
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleAction(r, "remove")}>
                Remove Content
              </Button>
              <Button size="sm" variant="destructive" className="bg-destructive/80" onClick={() => handleAction(r, "ban")}>
                Ban User
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminReports;
