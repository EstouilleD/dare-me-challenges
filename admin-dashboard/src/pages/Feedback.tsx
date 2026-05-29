import { useEffect, useState, useMemo } from 'react';
import { Search, MessageSquarePlus, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

interface Feedback {
  id: string;
  category: string;
  message: string;
  page_url: string | null;
  created_at: string;
  user_id: string;
  profiles: { display_name: string; email: string } | null;
}

const CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  bug:     { label: 'Bug Report',       emoji: '🐛', color: 'bg-red-500/15 text-red-400' },
  feature: { label: 'Feature Request',  emoji: '💡', color: 'bg-amber-500/15 text-amber-400' },
  ux:      { label: 'UX / Design',      emoji: '🎨', color: 'bg-purple-500/15 text-purple-400' },
  general: { label: 'General Feedback', emoji: '💬', color: 'bg-blue-500/15 text-blue-400' },
};

const PAGE_SIZE = 25;

export default function FeedbackPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<Feedback | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; item: Feedback | null; loading: boolean }>({
    open: false, item: null, loading: false,
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('beta_feedback' as any)
      .select('id, category, message, page_url, created_at, user_id, profiles(display_name, email)')
      .order('created_at', { ascending: false });

    if (error) {
      toast('error', `Failed to load feedback: ${error.message}`);
    } else {
      setItems((data ?? []).map((f: Record<string, unknown>) => ({
        ...f,
        profiles: Array.isArray(f.profiles) ? f.profiles[0] ?? null : f.profiles,
      })) as Feedback[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(f => {
      const matchSearch = !q
        || f.message.toLowerCase().includes(q)
        || f.profiles?.display_name.toLowerCase().includes(q)
        || f.profiles?.email.toLowerCase().includes(q)
        || (f.page_url ?? '').toLowerCase().includes(q);
      const matchCat = catFilter === 'all' || f.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [items, search, catFilter]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Stats per category
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of items) counts[f.category] = (counts[f.category] ?? 0) + 1;
    return counts;
  }, [items]);

  async function handleDelete() {
    if (!confirm.item) return;
    setConfirm(c => ({ ...c, loading: true }));
    const { error } = await supabase.from('beta_feedback' as any).delete().eq('id', confirm.item.id);
    if (error) {
      toast('error', 'Failed to delete feedback');
    } else {
      toast('success', 'Feedback deleted');
      setDetail(null);
      await load();
    }
    setConfirm({ open: false, item: null, loading: false });
  }

  const catBadge = (cat: string) => {
    const meta = CATEGORIES[cat] ?? { label: cat, emoji: '💬', color: 'bg-slate-700 text-slate-400' };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.color}`}>
        {meta.emoji} {meta.label}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(CATEGORIES).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => { setCatFilter(catFilter === key ? 'all' : key); setPage(0); }}
            className={`rounded-2xl p-4 border text-left transition-colors ${
              catFilter === key
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-800 bg-slate-900 hover:border-slate-700'
            }`}
          >
            <p className="text-2xl mb-1">{meta.emoji}</p>
            <p className="text-xl font-bold text-slate-100">{stats[key] ?? 0}</p>
            <p className="text-xs text-slate-500">{meta.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search messages, users or pages…"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => { setCatFilter(e.target.value); setPage(0); }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All categories ({items.length})</option>
          {Object.entries(CATEGORIES).map(([key, meta]) => (
            <option key={key} value={key}>{meta.emoji} {meta.label} ({stats[key] ?? 0})</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">{filtered.length.toLocaleString()} entries</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MessageSquarePlus className="w-3.5 h-3.5" />
            Beta Feedback
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['User', 'Category', 'Message', 'Page', 'Date', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500">Loading…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500">No feedback found</td></tr>
              ) : paginated.map(f => (
                <tr
                  key={f.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors cursor-pointer"
                  onClick={() => setDetail(f)}
                >
                  <td className="px-5 py-3">
                    <p className="text-slate-200 text-xs font-medium">{f.profiles?.display_name ?? '—'}</p>
                    <p className="text-slate-500 text-[11px]">{f.profiles?.email ?? '—'}</p>
                  </td>
                  <td className="px-5 py-3">{catBadge(f.category)}</td>
                  <td className="px-5 py-3 text-slate-300 text-xs max-w-sm">
                    <p className="line-clamp-2">{f.message}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-[11px] max-w-[140px] truncate">
                    {f.page_url ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {format(new Date(f.created_at), 'MMM d, yyyy')}
                    <br />
                    <span className="text-[11px]">{format(new Date(f.created_at), 'HH:mm')}</span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); setConfirm({ open: true, item: f, loading: false }); }}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
          <div className="absolute inset-0 bg-black/75" onClick={() => setDetail(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              {catBadge(detail.category)}
              <span className="text-xs text-slate-500">{format(new Date(detail.created_at), 'MMM d, yyyy · HH:mm')}</span>
            </div>

            <div className="space-y-3 mb-5">
              <div className="bg-slate-800 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-0.5">From</p>
                <p className="text-sm font-medium text-slate-200">{detail.profiles?.display_name ?? '—'}</p>
                <p className="text-xs text-slate-400">{detail.profiles?.email ?? '—'}</p>
              </div>
              {detail.page_url && (
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-0.5">Page</p>
                  <p className="text-sm text-slate-300 font-mono">{detail.page_url}</p>
                </div>
              )}
              <div className="bg-slate-800 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Message</p>
                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{detail.message}</p>
              </div>
            </div>

            <button
              onClick={() => { setDetail(null); setConfirm({ open: true, item: detail, loading: false }); }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirm.open}
        title="Delete Feedback"
        message="Permanently delete this feedback entry?"
        confirmLabel="Delete"
        danger
        loading={confirm.loading}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />
    </div>
  );
}
