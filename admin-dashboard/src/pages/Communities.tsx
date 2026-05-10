import { useEffect, useState, useMemo } from 'react';
import { Search, Trash2, Edit2, X, ChevronLeft, ChevronRight, BadgeCheck, Users, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  category: string;
  member_count: number;
  is_verified: boolean;
  created_at: string;
  owner_id: string;
  logo_url: string | null;
  profiles: { display_name: string } | null;
  challenge_count?: number;
}

const PAGE_SIZE = 20;

export default function Communities() {
  const { toast } = useToast();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<Community | null>(null);
  const [editing, setEditing] = useState<Partial<Community> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; community: Community | null; loading: boolean }>({
    open: false, community: null, loading: false,
  });
  const [members, setMembers] = useState<{ display_name: string; role: string; joined_at: string }[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('communities')
      .select('id, name, slug, description, type, category, member_count, is_verified, created_at, owner_id, logo_url, profiles(display_name)')
      .order('member_count', { ascending: false });

    if (data) {
      const ids = data.map(c => c.id);
      const { data: challenges } = await supabase.from('challenges').select('community_id').in('community_id', ids);
      const challengeCount = new Map<string, number>();
      (challenges ?? []).forEach(c => challengeCount.set(c.community_id!, (challengeCount.get(c.community_id!) ?? 0) + 1));
      setCommunities(data.map(c => ({
        ...c,
        profiles: Array.isArray(c.profiles) ? c.profiles[0] ?? null : c.profiles,
        challenge_count: challengeCount.get(c.id) ?? 0,
      }) as Community));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return communities.filter(c => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      const matchType = typeFilter === 'all' || c.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [communities, search, typeFilter]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function openDetail(community: Community) {
    setDetail(community);
    setMembersLoading(true);
    const { data } = await supabase
      .from('community_members')
      .select('role, joined_at, profiles(display_name)')
      .eq('community_id', community.id)
      .order('joined_at', { ascending: false })
      .limit(10);
    setMembers((data ?? []).map(m => ({
      role: m.role,
      joined_at: m.joined_at,
      display_name: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)?.display_name ?? '—',
    })));
    setMembersLoading(false);
  }

  async function handleEdit() {
    if (!editing || !detail) return;
    setEditLoading(true);
    try {
      await supabase.from('communities').update({
        name: editing.name, description: editing.description, is_verified: editing.is_verified,
      }).eq('id', detail.id);
      toast('success', 'Community updated');
      await load();
      setEditing(null);
      setDetail(null);
    } catch {
      toast('error', 'Update failed');
    }
    setEditLoading(false);
  }

  async function handleDelete() {
    if (!deleteConfirm.community) return;
    setDeleteConfirm(c => ({ ...c, loading: true }));
    try {
      await supabase.from('communities').delete().eq('id', deleteConfirm.community.id);
      toast('success', `Community "${deleteConfirm.community.name}" deleted`);
      await load();
    } catch {
      toast('error', 'Failed to delete community');
    }
    setDeleteConfirm({ open: false, community: null, loading: false });
    setDetail(null);
  }

  const typeBadge = (type: string, verified: boolean) => (
    <div className="flex items-center gap-1.5">
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        type === 'brand' ? 'bg-amber-500/20 text-amber-400' :
        type === 'private' ? 'bg-slate-700 text-slate-400' : 'bg-emerald-500/15 text-emerald-400'
      }`}>{type}</span>
      {verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search communities…"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">All types</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
          <option value="brand">Brand</option>
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <span className="text-sm font-medium text-slate-300">{filtered.length.toLocaleString()} communities</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Community', 'Owner', 'Type', 'Members', 'Challenges', 'Created', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">Loading…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">No communities found</td></tr>
              ) : paginated.map(c => (
                <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      {c.logo_url
                        ? <img src={c.logo_url} alt={c.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        : <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center text-xs font-bold text-indigo-400">{c.name[0]}</div>
                      }
                      <span className="font-medium text-slate-200">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{c.profiles?.display_name ?? '—'}</td>
                  <td className="px-5 py-3">{typeBadge(c.type, c.is_verified)}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    <div className="flex items-center gap-1"><Users className="w-3 h-3" />{c.member_count.toLocaleString()}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    <div className="flex items-center gap-1"><Trophy className="w-3 h-3" />{c.challenge_count}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{format(new Date(c.created_at), 'MMM d, yyyy')}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openDetail(c)} title="View & edit" className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteConfirm({ open: true, community: c, loading: false })} title="Delete" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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

      {/* Detail / Edit modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => { setDetail(null); setEditing(null); }} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setDetail(null); setEditing(null); }} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-5">
              {detail.logo_url
                ? <img src={detail.logo_url} alt={detail.name} className="w-12 h-12 rounded-xl object-cover" />
                : <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center text-lg font-bold text-indigo-400">{detail.name[0]}</div>
              }
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-100 text-lg">{detail.name}</h2>
                  {detail.is_verified && <BadgeCheck className="w-4 h-4 text-blue-400" />}
                </div>
                <p className="text-xs text-slate-400">{detail.category} · {detail.type}</p>
              </div>
            </div>

            {editing ? (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Name</label>
                  <input value={editing.name ?? ''} onChange={e => setEditing(v => ({ ...v, name: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Description</label>
                  <textarea value={editing.description ?? ''} onChange={e => setEditing(v => ({ ...v, description: e.target.value }))} rows={3}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.is_verified ?? false} onChange={e => setEditing(v => ({ ...v, is_verified: e.target.checked }))}
                    className="w-4 h-4 rounded accent-indigo-500" />
                  <span className="text-sm text-slate-300">Verified community</span>
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-xl text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">Cancel</button>
                  <button onClick={handleEdit} disabled={editLoading} className="flex-1 py-2 rounded-xl text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50">
                    {editLoading ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400 mb-4">{detail.description}</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[['Members', detail.member_count.toLocaleString()], ['Challenges', detail.challenge_count], ['Owner', detail.profiles?.display_name ?? '—'], ['Created', format(new Date(detail.created_at), 'MMM d, yyyy')]].map(([k, v]) => (
                    <div key={String(k)} className="bg-slate-800 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">{k}</p>
                      <p className="text-sm font-medium text-slate-200">{String(v)}</p>
                    </div>
                  ))}
                </div>
                {/* Members list */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-400 mb-2">Recent Members</p>
                  {membersLoading ? <p className="text-xs text-slate-500">Loading…</p> :
                    members.map((m, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-800 last:border-0">
                        <span className="text-xs text-slate-300">{m.display_name}</span>
                        <span className="text-[10px] text-slate-500 capitalize">{m.role}</span>
                      </div>
                    ))
                  }
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing({ name: detail.name, description: detail.description, is_verified: detail.is_verified })}
                    className="flex-1 py-2 rounded-xl text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">Edit</button>
                  <button onClick={() => { setDetail(null); setDeleteConfirm({ open: true, community: detail, loading: false }); }}
                    className="flex-1 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-700 text-white transition-colors">Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteConfirm.open}
        title="Delete Community"
        message={`Permanently delete "${deleteConfirm.community?.name}"? All members and posts will be removed.`}
        confirmLabel="Delete"
        danger
        loading={deleteConfirm.loading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(c => ({ ...c, open: false }))}
      />
    </div>
  );
}
