import { useEffect, useState, useMemo } from 'react';
import { Search, Trash2, Eye, ChevronLeft, ChevronRight, X, Users, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

interface Challenge {
  id: string;
  title: string;
  description: string;
  status: string;
  is_public: boolean | null;
  created_at: string;
  end_date: string;
  owner_id: string;
  community_only: boolean;
  profiles: { display_name: string; email: string } | null;
  challenge_types: { name: string; icon: string } | null;
  participant_count?: number;
  proof_count?: number;
  report_count?: number;
}

const PAGE_SIZE = 20;

export default function Challenges() {
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<Challenge | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; challenge: Challenge | null; loading: boolean }>({
    open: false, challenge: null, loading: false,
  });

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('challenges')
      .select(`
        id, title, description, status, is_public, created_at, end_date, owner_id, community_only,
        profiles(display_name, email),
        challenge_types(name, icon)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      const ids = data.map(c => c.id);
      const [{ data: parts }, { data: proofs }, { data: reports }] = await Promise.all([
        supabase.from('participations').select('challenge_id').in('challenge_id', ids),
        supabase.from('proofs').select('challenge_id').in('challenge_id', ids),
        supabase.from('reports').select('challenge_id').in('challenge_id', ids),
      ]);
      const partCount = new Map<string, number>();
      const proofCount = new Map<string, number>();
      const reportCount = new Map<string, number>();
      (parts ?? []).forEach(p => partCount.set(p.challenge_id, (partCount.get(p.challenge_id) ?? 0) + 1));
      (proofs ?? []).forEach(p => proofCount.set(p.challenge_id, (proofCount.get(p.challenge_id) ?? 0) + 1));
      (reports ?? []).forEach(r => reportCount.set(r.challenge_id, (reportCount.get(r.challenge_id) ?? 0) + 1));
      setChallenges(data.map(c => ({
        ...c,
        profiles: Array.isArray(c.profiles) ? c.profiles[0] ?? null : c.profiles,
        challenge_types: Array.isArray(c.challenge_types) ? c.challenge_types[0] ?? null : c.challenge_types,
        participant_count: partCount.get(c.id) ?? 0,
        proof_count: proofCount.get(c.id) ?? 0,
        report_count: reportCount.get(c.id) ?? 0,
      }) as Challenge));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return challenges.filter(c => {
      const matchSearch = !q || c.title.toLowerCase().includes(q) || c.profiles?.display_name.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || c.status === statusFilter ||
        (statusFilter === 'reported' && (c.report_count ?? 0) > 0);
      const matchVis = visibilityFilter === 'all' ||
        (visibilityFilter === 'public' && c.is_public) ||
        (visibilityFilter === 'private' && !c.is_public) ||
        (visibilityFilter === 'community' && c.community_only);
      return matchSearch && matchStatus && matchVis;
    });
  }, [challenges, search, statusFilter, visibilityFilter]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function handleDelete() {
    if (!deleteConfirm.challenge) return;
    setDeleteConfirm(c => ({ ...c, loading: true }));
    try {
      await supabase.from('challenges').delete().eq('id', deleteConfirm.challenge.id);
      toast('success', `Challenge "${deleteConfirm.challenge.title}" deleted`);
      await load();
    } catch {
      toast('error', 'Failed to delete challenge');
    }
    setDeleteConfirm({ open: false, challenge: null, loading: false });
    setDetail(null);
  }

  const statusBadge = (status: string, reportCount = 0) => {
    const colors: Record<string, string> = {
      active: 'bg-emerald-500/15 text-emerald-400',
      completed: 'bg-blue-500/15 text-blue-400',
      pending: 'bg-amber-500/15 text-amber-400',
      cancelled: 'bg-slate-700 text-slate-400',
    };
    return (
      <div className="flex items-center gap-1.5">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[status] ?? 'bg-slate-700 text-slate-400'}`}>{status}</span>
        {reportCount > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400">{reportCount} report{reportCount > 1 ? 's' : ''}</span>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search challenges…"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="reported">Has reports</option>
        </select>
        <select value={visibilityFilter} onChange={e => { setVisibilityFilter(e.target.value); setPage(0); }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">All visibility</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
          <option value="community">Community only</option>
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <span className="text-sm font-medium text-slate-300">{filtered.length.toLocaleString()} challenges</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Challenge', 'Owner', 'Type', 'Status', 'Participants', 'Created', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">Loading…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">No challenges found</td></tr>
              ) : paginated.map(c => (
                <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3 max-w-xs">
                    <p className="font-medium text-slate-200 truncate">{c.title}</p>
                    <p className="text-xs text-slate-500 truncate">{c.description}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{c.profiles?.display_name ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{c.challenge_types?.icon} {c.challenge_types?.name}</td>
                  <td className="px-5 py-3">{statusBadge(c.status, c.report_count)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Users className="w-3 h-3" />{c.participant_count}
                      <FileText className="w-3 h-3 ml-2" />{c.proof_count}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{format(new Date(c.created_at), 'MMM d, yyyy')}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDetail(c)} title="View details" className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteConfirm({ open: true, challenge: c, loading: false })} title="Delete" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
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
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-1">{detail.challenge_types?.icon} {detail.challenge_types?.name}</p>
              <h2 className="text-lg font-bold text-slate-100">{detail.title}</h2>
              <p className="text-sm text-slate-400 mt-1">{detail.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                ['Owner', detail.profiles?.display_name ?? '—'],
                ['Status', detail.status],
                ['Visibility', detail.is_public ? 'Public' : detail.community_only ? 'Community' : 'Private'],
                ['Participants', detail.participant_count],
                ['Proofs', detail.proof_count],
                ['Reports', detail.report_count],
                ['Created', format(new Date(detail.created_at), 'MMM d, yyyy')],
                ['Ends', format(new Date(detail.end_date), 'MMM d, yyyy')],
              ].map(([k, v]) => (
                <div key={String(k)} className="bg-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">{k}</p>
                  <p className="text-sm font-medium text-slate-200">{String(v)}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setDetail(null); setDeleteConfirm({ open: true, challenge: detail, loading: false }); }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Delete Challenge
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteConfirm.open}
        title="Delete Challenge"
        message={`Permanently delete "${deleteConfirm.challenge?.title}"? This will also remove all participations and proofs.`}
        confirmLabel="Delete"
        danger
        loading={deleteConfirm.loading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(c => ({ ...c, open: false }))}
      />
    </div>
  );
}
