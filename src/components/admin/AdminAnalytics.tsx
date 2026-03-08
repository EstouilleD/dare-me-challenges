import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  Users, TrendingUp, DollarSign, Activity, BarChart3, Target,
  Crown, Award, Zap, MessageSquare, ArrowUpRight, ArrowDownRight
} from "lucide-react";

const CHART_COLORS = [
  "hsl(230, 67%, 46%)",
  "hsl(110, 72%, 50%)",
  "hsl(210, 90%, 60%)",
  "hsl(0, 85%, 60%)",
  "hsl(45, 90%, 55%)",
];

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
}

const MetricCard = ({ title, value, subtitle, icon: Icon, trend }: MetricCardProps) => (
  <Card className="shadow-card">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          {trend !== undefined && (
            trend >= 0 ? <ArrowUpRight className="h-3 w-3 text-green-500" /> : <ArrowDownRight className="h-3 w-3 text-destructive" />
          )}
          {subtitle}
        </p>
      )}
    </CardContent>
  </Card>
);

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState({ dau: 0, wau: 0, mau: 0 });
  const [challengeMetrics, setChallengeMetrics] = useState<any>({});
  const [monetization, setMonetization] = useState<any>({});
  const [communityMetrics, setCommunityMetrics] = useState<any>({});
  const [retention, setRetention] = useState({ d1_retention: 0, d7_retention: 0, d30_retention: 0 });
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [engagementTrends, setEngagementTrends] = useState<any[]>([]);
  const [topChallenges, setTopChallenges] = useState<any[]>([]);
  const [topCommunities, setTopCommunities] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [
        auRes, cmRes, monRes, comRes, retRes, ugRes, etRes, tcRes, tcoRes
      ] = await Promise.all([
        supabase.from("v_active_users" as any).select("*").single(),
        supabase.from("v_challenge_metrics" as any).select("*").single(),
        supabase.from("v_monetization" as any).select("*").single(),
        supabase.from("v_community_metrics" as any).select("*").single(),
        supabase.from("v_retention" as any).select("*").single(),
        supabase.from("v_user_growth" as any).select("*"),
        supabase.from("v_engagement_trends" as any).select("*"),
        supabase.from("v_top_challenges" as any).select("*"),
        supabase.from("v_top_communities" as any).select("*"),
      ]);

      if (auRes.data) setActiveUsers(auRes.data as any);
      if (cmRes.data) setChallengeMetrics(cmRes.data);
      if (monRes.data) setMonetization(monRes.data);
      if (comRes.data) setCommunityMetrics(comRes.data);
      if (retRes.data) setRetention(retRes.data as any);
      if (ugRes.data) setUserGrowth(ugRes.data as any[]);
      if (etRes.data) setEngagementTrends(etRes.data as any[]);
      if (tcRes.data) setTopChallenges(tcRes.data as any[]);
      if (tcoRes.data) setTopCommunities(tcoRes.data as any[]);

      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p className="text-muted-foreground py-8 text-center">Loading analytics...</p>;

  const premiumRate = monetization.total_users > 0
    ? ((monetization.active_premium / monetization.total_users) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="engagement" className="text-xs">Engagement</TabsTrigger>
          <TabsTrigger value="monetization" className="text-xs">Revenue</TabsTrigger>
          <TabsTrigger value="communities" className="text-xs">Communities</TabsTrigger>
          <TabsTrigger value="retention" className="text-xs">Retention</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard title="DAU" value={activeUsers.dau} icon={Users} />
            <MetricCard title="WAU" value={activeUsers.wau} icon={Users} />
            <MetricCard title="MAU" value={activeUsers.mau} icon={Users} />
            <MetricCard title="Total Users" value={monetization.total_users || 0} icon={Users} />
          </div>

          {/* User Growth Chart */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> User Growth (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short' })} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString()} />
                    <Bar dataKey="signups" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Challenges */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" /> Top Challenges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topChallenges.length === 0 && <p className="text-muted-foreground text-sm">No data yet</p>}
                {topChallenges.map((c: any, i: number) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <span className="text-sm font-medium truncate max-w-[200px]">{c.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{c.participant_count} 👥</span>
                      <span>{c.proof_count} 📸</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Communities */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Top Communities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topCommunities.length === 0 && <p className="text-muted-foreground text-sm">No data yet</p>}
                {topCommunities.map((c: any, i: number) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <span className="text-sm font-medium truncate max-w-[200px]">{c.name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{c.type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{c.member_count} members</span>
                      <span className="text-green-600">+{c.new_members_7d} 7d</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ENGAGEMENT */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard title="Challenges Created" value={challengeMetrics.total_created || 0} subtitle={`${challengeMetrics.created_7d || 0} this week`} icon={Target} />
            <MetricCard title="Joins" value={challengeMetrics.total_joins || 0} subtitle={`${challengeMetrics.joins_7d || 0} this week`} icon={Users} />
            <MetricCard title="Proofs" value={challengeMetrics.total_proofs || 0} subtitle={`${challengeMetrics.proofs_7d || 0} this week`} icon={Activity} />
            <MetricCard title="Votes" value={challengeMetrics.total_votes || 0} subtitle={`${challengeMetrics.votes_7d || 0} this week`} icon={BarChart3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard title="Avg Participants / Challenge" value={challengeMetrics.avg_participants || 0} icon={Users} />
            <MetricCard title="Completion Rate" value={`${challengeMetrics.completion_rate || 0}%`} icon={Target} />
          </div>

          {/* Engagement Trends */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" /> Engagement Trends (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagementTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short' })} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString()} />
                    <Line type="monotone" dataKey="challenges_created" stroke={CHART_COLORS[0]} strokeWidth={2} name="Created" dot={false} />
                    <Line type="monotone" dataKey="challenges_joined" stroke={CHART_COLORS[1]} strokeWidth={2} name="Joined" dot={false} />
                    <Line type="monotone" dataKey="proofs_submitted" stroke={CHART_COLORS[2]} strokeWidth={2} name="Proofs" dot={false} />
                    <Line type="monotone" dataKey="votes_submitted" stroke={CHART_COLORS[3]} strokeWidth={2} name="Votes" dot={false} />
                    <Line type="monotone" dataKey="boosters_used" stroke={CHART_COLORS[4]} strokeWidth={2} name="Boosters" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MONETIZATION */}
        <TabsContent value="monetization" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard title="Premium Subscribers" value={monetization.active_premium || 0} icon={Crown} />
            <MetricCard title="Conversion Rate" value={`${premiumRate}%`} icon={TrendingUp} />
            <MetricCard title="Certificates Sold" value={monetization.total_certificates || 0} subtitle={`${monetization.certificates_7d || 0} this week`} icon={Award} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard title="Total Boosters Used" value={monetization.total_boosts || 0} subtitle={`${monetization.boosts_7d || 0} this week`} icon={Zap} />
            <MetricCard title="Coins Spent on Boosters" value={monetization.total_boost_coins || 0} icon={DollarSign} />
            <MetricCard title="Total Users" value={monetization.total_users || 0} icon={Users} />
          </div>

          {/* Revenue breakdown pie */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Revenue Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Subscriptions", value: monetization.active_premium || 0 },
                        { name: "Certificates", value: monetization.total_certificates || 0 },
                        { name: "Boosters", value: monetization.total_boosts || 0 },
                      ]}
                      cx="50%" cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                      dataKey="value"
                    >
                      {[0, 1, 2].map((i) => (
                        <Cell key={i} fill={CHART_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMMUNITIES */}
        <TabsContent value="communities" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard title="Total Communities" value={communityMetrics.total_communities || 0} icon={MessageSquare} />
            <MetricCard title="Brand Communities" value={communityMetrics.brand_communities || 0} icon={Crown} />
            <MetricCard title="Active Community Challenges" value={communityMetrics.active_community_challenges || 0} icon={Target} />
            <MetricCard title="New Members (7d)" value={communityMetrics.new_members_7d || 0} icon={Users} />
          </div>
        </TabsContent>

        {/* RETENTION */}
        <TabsContent value="retention" className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard title="D1 Retention" value={`${retention.d1_retention || 0}%`} icon={Activity} />
            <MetricCard title="D7 Retention" value={`${retention.d7_retention || 0}%`} icon={Activity} />
            <MetricCard title="D30 Retention" value={`${retention.d30_retention || 0}%`} icon={Activity} />
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-sm">Retention Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { period: "Day 1", rate: retention.d1_retention || 0 },
                    { period: "Day 7", rate: retention.d7_retention || 0 },
                    { period: "Day 30", rate: retention.d30_retention || 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="rate" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAnalytics;
