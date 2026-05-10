import { useEffect, useState, useMemo } from 'react';
import { Search, CheckCircle, Trash2, X, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

interface Report {
  id: string;
  reason: string;
  details: string | null;
  created_at: string;
  challenge_id: string;
  reporter_id: string;
  resolved?: boolean;
  challenges: { title: string; status: string; owner_id: string } | null;
  reporter: { display_name: string; email: string } | null;
}

const PAGE_SIZE = 20;
const REASONS = ['all', 'spam', 'inappropriate', 'fake', 'harassment', 'other'];

export default function Reports() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [resolvedFilter, setResolvedFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<Report | null>(null);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    type: 'deleteChallenge' | 'dismiss';
    report: Report | null;
    loading: boolean;
  }>({ open: false, type: 'dismiss', report: null, loading: false });

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('reports')
      .select(`
        id, reason, details, created_at, challenge_id, reporter_id,
        challenges(title, status, owner_id),
        profiles!reports_reporter_id_fkey(display_name, email)
      `)
      .order('created_at', { ascending: false });

    setReports((data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      challenges: Array.isArray(r.challenges) ? r.challenges[0] ?? null : r.challenges,
      reporter: Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles,
      resolved: false,
    })) as Report[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return reports.filter(r => {
      const matchSearch = !q || r.challenges?.title.toLowerCase().includes(q) || r.reporter?.display_name.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q);
      const matchReason = reasonFilter === 'all' || r.reason === reasonFilter;
      const matchResolved = resolvedFilter === 'all' ||
        (resolvedFilter === 'open' && !r.resolved) ||
        (resolvedFilter === 'resolved' && r.resolved);
      return matchSearch && matchReason && matchResolved;
    });
  }, [reports, search, reasonFilter, resolvedFilter]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function markResolved(id: string) {
    setReports(prev => prev.map(r => r.id === id ? { ...r, resolved: true } : r));
    toast('success', 'Report marked as resolved');
    setDetail(null);
  }

  async function handleDeleteChallenge() {
    if (!confirm.report) return;
    setConfirm(c => ({ ...c, loading: true }));
    try {
      await supabase.from('challenges').delete().eq('id', confirm.report.challenge_id);
      toast('success', 'Challenge deleted and report resolved');
      markResolved(confirm.report.id);
    } catch {
      toast('error', 'Failed to delete challenge');
    }
    setConfirm({ open: false, type: 'dismiss', report: null, loading: false });
  }

  async function handleDismiss() {
    if (!confirm.report) return;
    setConfirm(c => ({ ...c, loading: true }));
    markResolved(confirm.report.id);
    setConfirm({ open: false, type: 'dismiss', report: null, loading: false });
  }

  const reasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      spam: 'bg-orange-500/15 text-orange-400',
      inappropriate: 'bg-red-500/15 text-red-400',
      fake: 'bg-purple-500/15 text-purple-400',
      harassment: 'bg-rose-500/15 text-rose-400',
      other: 'bg-slate-700 text-slate-400',
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[reason] ?? 'bg-slate-700 text-slate-400'}`}>{reason}</span>;
  };

  const openCount = reports.filter(r => !r.resolved).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
          <Flag className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold text-red-400">{openCount} open report{openCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search reports…"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={reasonFilter} onChange={e => { setReasonFilter(e.target.value); setPage(0); }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {REASONS.map(r => <option key={r} value={r}>{r === 'all' ? 'All reasons' : r}</option>)}
        </select>
        <select value={resolvedFilter} onChange={e => { setResolvedFilter(e.target.value as 'all' | 'open' | 'resolved'); setPage(0); }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <span className="text-sm font-medium text-slate-300">{filtered.length.toLocaleString()} reports</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Challenge', 'Reporter', 'Reason', 'Details', 'Reported', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">Loading…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">No reports found</td></tr>
              ) : paginated.map(r => (
                <tr key={r.id} className={`border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors ${r.resolved ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3">
                    <button onClick={() => setDetail(r)} className="text-left hover:text-indigo-400 transition-colors">
                      <p className="font-medium text-slate-200 truncate max-w-[180px]">{r.challenges?.title ?? 'Deleted'}</p>
                    </button>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{r.reporter?.display_name ?? '—'}</td>
                  <td className="px-5 py-3">{reasonBadge(r.reason)}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs max-w-[200px] truncate">{r.details ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{format(new Date(r.created_at), 'MMM d, yyyy')}</td>
                  <td className="px-5 py-3">
                    {r.resolved
                      ? <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700 text-slate-400">Resolved</span>
                      : <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400">Open</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    {!r.resolved && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setConfirm({ open: true, type: 'deleteChallenge', report: r, loading: false })} title="Delete challenge" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirm({ open: true, type: 'dismiss', report: r, loading: false })} title="Dismiss report" className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"><CheckCircle className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </td>
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

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDetail(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-2 mb-4">
              <Flag className="w-5 h-5 text-red-400" />
              <h2 className="font-semibold text-slate-100 text-lg">Report Details</h2>
            </div>
            <div className="space-y-3 mb-5">
              {[
                ['Challenge', detail.challenges?.title ?? 'Deleted'],
                ['Reporter', detail.reporter?.display_name ?? '—'],
                ['Reporter email', detail.reporter?.email ?? '—'],
                ['Reason', detail.reason],
                ['Reported', format(new Date(detail.created_at), 'MMM d, yyyy HH:mm')],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">{k}</p>
                  <p className="text-sm font-medium text-slate-200">{v}</p>
                </div>
              ))}
              {detail.details && (
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Additional details</p>
                  <p className="text-sm text-slate-300">{detail.details}</p>
                </div>
              )}
            </div>
            {!detail.resolved && (
              <div className="flex gap-2">
                <button onClick={() => { setDetail(null); setConfirm({ open: true, type: 'deleteChallenge', report: detail, loading: false }); }}
                  className="flex-1 py-2.5 rounded-xl text-sm bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">
                  Delete Challenge
                </button>
                <button onClick={() => { setDetail(null); setConfirm({ open: true, type: 'dismiss', report: detail, loading: false }); }}
                  className="flex-1 py-2.5 rounded-xl text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors">
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirm.open}
        title={confirm.type === 'deleteChallenge' ? 'Delete Challenge' : 'Dismiss Report'}
        message={confirm.type === 'deleteChallenge'
          ? `Delete "${confirm.report?.challenges?.title}"? This action is permanent and will also remove all participations.`
          : `Dismiss this report? No action will be taken on the challenge.`}
        confirmLabel={confirm.type === 'deleteChallenge' ? 'Delete Challenge' : 'Dismiss'}
        danger={confirm.type === 'deleteChallenge'}
        loading={confirm.loading}
        onConfirm={confirm.type === 'deleteChallenge' ? handleDeleteChallenge : handleDismiss}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />
    </div>
  );
}
