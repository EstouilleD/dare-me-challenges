import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Users, FileText, Flag, AlertTriangle, Trash2 } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalChallenges: number;
  totalReports: number;
  underReview: number;
  removed: number;
}

const AdminOverview = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalChallenges: 0,
    totalReports: 0,
    underReview: 0,
    removed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [usersRes, challengesRes, reportsRes, underReviewRes, removedRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("challenges").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("challenges").select("*", { count: "exact", head: true }).eq("status", "under_review"),
        supabase.from("challenges").select("*", { count: "exact", head: true }).eq("status", "removed"),
      ]);

      setStats({
        totalUsers: usersRes.count ?? 0,
        totalChallenges: challengesRes.count ?? 0,
        totalReports: reportsRes.count ?? 0,
        underReview: underReviewRes.count ?? 0,
        removed: removedRes.count ?? 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p className="text-muted-foreground">Loading stats...</p>;

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary" },
    { label: "Total Challenges", value: stats.totalChallenges, icon: FileText, color: "text-primary" },
    { label: "Total Reports", value: stats.totalReports, icon: Flag, color: "text-destructive" },
    { label: "Under Review", value: stats.underReview, icon: AlertTriangle, color: "text-orange-500" },
    { label: "Removed Content", value: stats.removed, icon: Trash2, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            <c.icon className={`h-5 w-5 ${c.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminOverview;
