import { useEffect, useState, useMemo, FormEvent } from 'react';
import { Search, Plus, Minus, ChevronLeft, ChevronRight, Coins as CoinsIcon, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
  profiles: { display_name: string; email: string } | null;
}

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  profiles: { display_name: string; email: string } | null;
}

interface Profile { id: string; display_name: string; email: string; }

const PAGE_SIZE = 20;

export default function Coins() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'transactions' | 'subscriptions' | 'adjust'>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(0);

  // Adjust coins form
  const [adjustSearch, setAdjustSearch] = useState('');
  const [adjustUsers, setAdjustUsers] = useState<Profile[]>([]);
  const [adjustTarget, setAdjustTarget] = useState<Profile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustBalance, setAdjustBalance] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: tx }, { data: subs }] = await Promise.all([
        supabase.from('coin_transactions').select('id, user_id, amount, transaction_type, description, created_at, profiles(display_name, email)').order('created_at', { ascending: false }).limit(500),
        supabase.from('subscriptions').select('id, user_id, plan, status, current_period_start, current_period_end, created_at, profiles(display_name, email)').order('created_at', { ascending: false }),
      ]);
      setTransactions((tx ?? []).map(t => ({ ...t, profiles: Array.isArray(t.profiles) ? t.profiles[0] ?? null : t.profiles })) as Transaction[]);
      setSubscriptions((subs ?? []).map(s => ({ ...s, profiles: Array.isArray(s.profiles) ? s.profiles[0] ?? null : s.profiles })) as Subscription[]);
      setLoading(false);
    }
    load();
  }, []);

  // Search users for adjust tab
  useEffect(() => {
    if (adjustSearch.length < 2) { setAdjustUsers([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id, display_name, email')
        .or(`display_name.ilike.%${adjustSearch}%,email.ilike.%${adjustSearch}%`).limit(5);
      setAdjustUsers((data ?? []) as Profile[]);
    }, 300);
    return () => clearTimeout(timer);
  }, [adjustSearch]);

  async function selectAdjustUser(user: Profile) {
    setAdjustTarget(user);
    setAdjustUsers([]);
    setAdjustSearch(user.display_name);
    const { data } = await supabase.from('coin_balances').select('balance').eq('user_id', user.id).maybeSingle();
    setAdjustBalance(data?.balance ?? 0);
  }

  async function handleAdjust(e: FormEvent) {
    e.preventDefault();
    if (!adjustTarget || !adjustAmount) return;
    const amount = parseInt(adjustAmount);
    if (isNaN(amount) || amount === 0) { toast('error', 'Enter a valid non-zero amount'); return; }
    setAdjustLoading(true);
    try {
      await supabase.from('coin_transactions').insert({
        user_id: adjustTarget.id,
        amount,
        transaction_type: 'admin_adjustment',
        description: adjustReason || 'Admin manual adjustment',
      });
      // Upsert balance
      const newBalance = Math.max(0, (adjustBalance ?? 0) + amount);
      const { data: existing } = await supabase.from('coin_balances').select('id').eq('user_id', adjustTarget.id).maybeSingle();
      if (existing) {
        await supabase.from('coin_balances').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', adjustTarget.id);
      } else {
        await supabase.from('coin_balances').insert({ user_id: adjustTarget.id, balance: Math.max(0, amount) });
      }
      toast('success', `${amount > 0 ? '+' : ''}${amount} coins applied to ${adjustTarget.display_name}`, `New balance: ${newBalance}`);
      setAdjustBalance(newBalance);
      setAdjustAmount('');
      setAdjustReason('');
    } catch {
      toast('error', 'Adjustment failed');
    }
    setAdjustLoading(false);
  }

  const filteredTx = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter(t => {
      const matchSearch = !q || t.profiles?.display_name.toLowerCase().includes(q) || t.profiles?.email.toLowerCase().includes(q);
      const matchType = typeFilter === 'all' || t.transaction_type === typeFilter;
      return matchSearch && matchType;
    });
  }, [transactions, search, typeFilter]);

  const pages = Math.ceil(filteredTx.length / PAGE_SIZE);
  const paginatedTx = filteredTx.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const txTypes = [...new Set(transactions.map(t => t.transaction_type))];
  const activeSubs = subscriptions.filter(s => s.status === 'active').length;
  const totalCoinsSpent = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const txTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      purchase: 'bg-emerald-500/15 text-emerald-400',
      spend: 'bg-red-500/15 text-red-400',
      admin_adjustment: 'bg-indigo-500/15 text-indigo-400',
      reward: 'bg-amber-500/15 text-amber-400',
      boost: 'bg-purple-500/15 text-purple-400',
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[type] ?? 'bg-slate-700 text-slate-400'}`}>{type}</span>;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-emerald-500/15 text-emerald-400',
      cancelled: 'bg-slate-700 text-slate-400',
      past_due: 'bg-red-500/15 text-red-400',
      trialing: 'bg-blue-500/15 text-blue-400',
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[status] ?? 'bg-slate-700 text-slate-400'}`}>{status}</span>;
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Transactions', value: transactions.length, icon: CoinsIcon, color: 'bg-indigo-600' },
          { label: 'Active Subscriptions', value: activeSubs, icon: Crown, color: 'bg-amber-600' },
          { label: 'Coins Spent Total', value: totalCoinsSpent.toLocaleString(), icon: Minus, color: 'bg-red-600' },
          { label: 'Admin Adjustments', value: transactions.filter(t => t.transaction_type === 'admin_adjustment').length, icon: Plus, color: 'bg-emerald-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400">{label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-3.5 h-3.5 text-white" /></div>
            </div>
            <p className="text-2xl font-bold text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {(['transactions', 'subscriptions', 'adjust'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {t === 'adjust' ? 'Adjust Coins' : t}
          </button>
        ))}
      </div>

      {tab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search by user…"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">All types</option>
              {txTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800">
              <span className="text-sm font-medium text-slate-300">{filteredTx.length.toLocaleString()} transactions</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['User', 'Type', 'Amount', 'Description', 'Date'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-500">Loading…</td></tr>
                  ) : paginatedTx.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-500">No transactions found</td></tr>
                  ) : paginatedTx.map(t => (
                    <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-200">{t.profiles?.display_name ?? '—'}</p>
                        <p className="text-xs text-slate-500">{t.profiles?.email}</p>
                      </td>
                      <td className="px-5 py-3">{txTypeBadge(t.transaction_type)}</td>
                      <td className="px-5 py-3">
                        <span className={`font-semibold ${t.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.amount > 0 ? '+' : ''}{t.amount}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs max-w-[200px] truncate">{t.description ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{format(new Date(t.created_at), 'MMM d, yyyy HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between text-sm">
                <span className="text-slate-500">Page {page + 1} of {pages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'subscriptions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['User', 'Plan', 'Status', 'Period Start', 'Period End'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-500">Loading…</td></tr>
                ) : subscriptions.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-500">No subscriptions</td></tr>
                ) : subscriptions.map(s => (
                  <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-200">{s.profiles?.display_name ?? '—'}</p>
                      <p className="text-xs text-slate-500">{s.profiles?.email}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-300 capitalize">{s.plan}</td>
                    <td className="px-5 py-3">{statusBadge(s.status)}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{s.current_period_start ? format(new Date(s.current_period_start), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{s.current_period_end ? format(new Date(s.current_period_end), 'MMM d, yyyy') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'adjust' && (
        <div className="max-w-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-semibold text-slate-100 mb-4">Manual Coin Adjustment</h2>
            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Search user</label>
                <div className="relative">
                  <input value={adjustSearch} onChange={e => { setAdjustSearch(e.target.value); setAdjustTarget(null); setAdjustBalance(null); }}
                    placeholder="Name or email…"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  {adjustUsers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-10 shadow-xl">
                      {adjustUsers.map(u => (
                        <button key={u.id} type="button" onClick={() => selectAdjustUser(u)}
                          className="w-full px-3 py-2.5 text-left hover:bg-slate-700 transition-colors">
                          <p className="text-sm text-slate-200">{u.display_name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {adjustTarget && adjustBalance !== null && (
                  <p className="text-xs text-slate-500 mt-1">Current balance: <span className="text-indigo-400 font-semibold">{adjustBalance} coins</span></p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Amount (+ to add, − to remove)</label>
                <input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 100 or -50"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Reason (optional)</label>
                <input value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                  placeholder="Compensation, refund, etc."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button type="submit" disabled={!adjustTarget || !adjustAmount || adjustLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                {adjustLoading ? 'Applying…' : 'Apply Adjustment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
