import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Users, Trophy, Users2, Star, TrendingUp, Activity, Coins, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';

interface ActiveUsers { dau: number | null; wau: number | null; mau: number | null; }
interface ChallengeMetrics { total_created: number | null; created_7d: number | null; total_joins: number | null; total_proofs: number | null; }
interface CommunityMetrics { total_communities: number | null; brand_communities: number | null; new_members_7d: number | null; }
interface Monetization { active_premium: number | null; total_boosts: number | null; total_boost_coins: number | null; total_certificates: number | null; }
interface GrowthRow { day: string | null; signups: number | null; }
interface TrendRow { day: string | null; challenges_created: number | null; challenges_joined: number | null; proofs_submitted: number | null; }

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-400 font-medium">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-100">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

const customTooltipStyle = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
};

export default function Dashboard() {
  const [activeUsers, setActiveUsers] = useState<ActiveUsers | null>(null);
  const [challengeMetrics, setChallengeMetrics] = useState<ChallengeMetrics | null>(null);
  const [communityMetrics, setCommunityMetrics] = useState<CommunityMetrics | null>(null);
  const [monetization, setMonetization] = useState<Monetization | null>(null);
  const [userGrowth, setUserGrowth] = useState<GrowthRow[]>([]);
  const [engagementTrends, setEngagementTrends] = useState<TrendRow[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [
        { data: au }, { data: cm }, { data: comMetrics }, { data: mon },
        { data: ug }, { data: et }, { count: tu },
      ] = await Promise.all([
        supabase.from('v_active_users').select('*').single(),
        supabase.from('v_challenge_metrics').select('*').single(),
        supabase.from('v_community_metrics').select('*').single(),
        supabase.from('v_monetization').select('*').single(),
        supabase.from('v_user_growth').select('*').order('day').limit(30),
        supabase.from('v_engagement_trends').select('*').order('day').limit(30),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
      ]);
      setActiveUsers(au as ActiveUsers);
      setChallengeMetrics(cm as ChallengeMetrics);
      setCommunityMetrics(comMetrics as CommunityMetrics);
      setMonetization(mon as Monetization);
      setUserGrowth((ug ?? []) as GrowthRow[]);
      setEngagementTrends((et ?? []) as TrendRow[]);
      setTotalUsers(tu ?? 0);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const growthData = userGrowth.map(r => ({
    day: r.day ? format(parseISO(r.day), 'MMM d') : '',
    signups: r.signups ?? 0,
  }));

  const trendData = engagementTrends.map(r => ({
    day: r.day ? format(parseISO(r.day), 'MMM d') : '',
    created: r.challenges_created ?? 0,
    joined: r.challenges_joined ?? 0,
    proofs: r.proofs_submitted ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={totalUsers.toLocaleString()} sub={`${activeUsers?.dau ?? 0} active today`} color="bg-indigo-600" />
        <StatCard icon={TrendingUp} label="Weekly Active" value={activeUsers?.wau ?? 0} sub={`${activeUsers?.mau ?? 0} monthly`} color="bg-blue-600" />
        <StatCard icon={Trophy} label="Total Challenges" value={challengeMetrics?.total_created ?? 0} sub={`+${challengeMetrics?.created_7d ?? 0} this week`} color="bg-amber-600" />
        <StatCard icon={Users2} label="Communities" value={communityMetrics?.total_communities ?? 0} sub={`${communityMetrics?.brand_communities ?? 0} brand`} color="bg-emerald-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Total Participations" value={(challengeMetrics?.total_joins ?? 0).toLocaleString()} sub={`${challengeMetrics?.total_proofs ?? 0} proofs submitted`} color="bg-violet-600" />
        <StatCard icon={Crown} label="Premium Subs" value={monetization?.active_premium ?? 0} sub="active subscriptions" color="bg-pink-600" />
        <StatCard icon={Coins} label="Boosts Used" value={monetization?.total_boosts ?? 0} sub={`${monetization?.total_boost_coins ?? 0} coins spent`} color="bg-orange-600" />
        <StatCard icon={Star} label="Certificates" value={monetization?.total_certificates ?? 0} sub={`${communityMetrics?.new_members_7d ?? 0} new members/wk`} color="bg-teal-600" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">User Growth (last 30 days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="signups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip {...customTooltipStyle} />
              <Area type="monotone" dataKey="signups" stroke="#6366f1" strokeWidth={2} fill="url(#signups)" name="Sign-ups" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Engagement Trends (last 30 days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip {...customTooltipStyle} />
              <Bar dataKey="created" fill="#6366f1" name="Created" radius={[2, 2, 0, 0]} />
              <Bar dataKey="joined" fill="#22d3ee" name="Joined" radius={[2, 2, 0, 0]} />
              <Bar dataKey="proofs" fill="#34d399" name="Proofs" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            {[['#6366f1', 'Created'], ['#22d3ee', 'Joined'], ['#34d399', 'Proofs']].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
