import { useEffect, useState, useMemo } from 'react';
import { Search, Shield, ShieldOff, Trash2, ShieldCheck, ShieldX, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

interface Profile {
  id: string;
  display_name: string;
  email: string;
  full_name: string | null;
  account_status: string;
  created_at: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  role?: string;
}

interface UserDetail extends Profile {
  challengesCreated: number;
  participations: number;
}

const PAGE_SIZE = 20;

export default function Users() {
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm] = useState<{
    open: boolean; type: 'block' | 'unblock' | 'delete' | 'makeAdmin' | 'removeAdmin';
    user: Profile | null; loading: boolean;
  }>({ open: false, type: 'delete', user: null, loading: false });

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    const roleMap = new Map((roles ?? []).map(r => [r.user_id, r.role]));
    setUsers((profiles ?? []).map(p => ({ ...p, role: roleMap.get(p.id) ?? 'user' })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => {
      const matchSearch = !q || u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || u.account_status === statusFilter ||
        (statusFilter === 'admin' && u.role === 'admin');
      return matchSearch && matchStatus;
    });
  }, [users, search, statusFilter]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function openDetail(user: Profile) {
    setDetailLoading(true);
    setDetail({ ...user, challengesCreated: 0, participations: 0 });
    const [{ count: cc }, { count: pc }] = await Promise.all([
      supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('owner_id', user.id),
      supabase.from('participations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    setDetail(d => d ? { ...d, challengesCreated: cc ?? 0, participations: pc ?? 0 } : null);
    setDetailLoading(false);
  }

  function startConfirm(type: typeof confirm['type'], user: Profile) {
    setConfirm({ open: true, type, user, loading: false });
  }

  async function handleConfirm() {
    if (!confirm.user) return;
    setConfirm(c => ({ ...c, loading: true }));
    const { id, display_name } = confirm.user;
    try {
      if (confirm.type === 'block') {
        await supabase.from('profiles').update({ account_status: 'blocked' }).eq('id', id);
        toast('success', `${display_name} blocked`);
      } else if (confirm.type === 'unblock') {
        await supabase.from('profiles').update({ account_status: 'active' }).eq('id', id);
        toast('success', `${display_name} unblocked`);
      } else if (confirm.type === 'delete') {
        await supabase.from('profiles').update({ account_status: 'deleted' }).eq('id', id);
        toast('success', `${display_name} marked as deleted`);
      } else if (confirm.type === 'makeAdmin') {
        await supabase.from('user_roles').upsert({ user_id: id, role: 'admin' }, { onConflict: 'user_id' });
        toast('success', `${display_name} is now admin`);
      } else if (confirm.type === 'removeAdmin') {
        await supabase.from('user_roles').delete().eq('user_id', id).eq('role', 'admin');
        toast('success', `Admin role removed from ${display_name}`);
      }
      await load();
    } catch {
      toast('error', 'Action failed');
    }
    setConfirm({ open: false, type: 'delete', user: null, loading: false });
    setDetail(null);
  }

  const statusBadge = (status: string, role?: string) => {
    if (role === 'admin') return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-400">Admin</span>;
    const colors: Record<string, string> = {
      active: 'bg-emerald-500/15 text-emerald-400',
      blocked: 'bg-red-500/15 text-red-400',
      deleted: 'bg-slate-700 text-slate-500',
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[status] ?? 'bg-slate-700 text-slate-400'}`}>{status}</span>;
  };

  const confirmMessages: Record<typeof confirm['type'], string> = {
    block: `Block "${confirm.user?.display_name}"? They will be unable to use the app.`,
    unblock: `Unblock "${confirm.user?.display_name}"? They will regain access.`,
    delete: `Mark "${confirm.user?.display_name}" as deleted? This is a soft delete.`,
    makeAdmin: `Grant admin role to "${confirm.user?.display_name}"?`,
    removeAdmin: `Remove admin role from "${confirm.user?.display_name}"?`,
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name or email…"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
          <option value="deleted">Deleted</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">{filtered.length.toLocaleString()} users</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['User', 'Email', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">Loading…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">No users found</td></tr>
              ) : paginated.map(user => (
                <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3">
                    <button onClick={() => openDetail(user)} className="flex items-center gap-2.5 hover:text-indigo-400 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400 uppercase shrink-0">
                        {user.display_name[0]}
                      </div>
                      <span className="font-medium text-slate-200">{user.display_name}</span>
                    </button>
                  </td>
                  <td className="px-5 py-3 text-slate-400">{user.email}</td>
                  <td className="px-5 py-3">{statusBadge(user.account_status, user.role)}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{format(new Date(user.created_at), 'MMM d, yyyy')}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      {user.account_status === 'blocked'
                        ? <ActionBtn onClick={() => startConfirm('unblock', user)} icon={<ShieldOff className="w-3.5 h-3.5" />} label="Unblock" color="text-emerald-400 hover:bg-emerald-500/10" />
                        : <ActionBtn onClick={() => startConfirm('block', user)} icon={<Shield className="w-3.5 h-3.5" />} label="Block" color="text-amber-400 hover:bg-amber-500/10" />
                      }
                      {user.role === 'admin'
                        ? <ActionBtn onClick={() => startConfirm('removeAdmin', user)} icon={<ShieldX className="w-3.5 h-3.5" />} label="Revoke admin" color="text-slate-400 hover:bg-slate-700" />
                        : <ActionBtn onClick={() => startConfirm('makeAdmin', user)} icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Make admin" color="text-indigo-400 hover:bg-indigo-500/10" />
                      }
                      <ActionBtn onClick={() => startConfirm('delete', user)} icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete" color="text-red-400 hover:bg-red-500/10" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between text-sm">
            <span className="text-slate-500">Page {page + 1} of {pages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDetail(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xl font-bold text-indigo-400 uppercase">
                {detail.display_name[0]}
              </div>
              <div>
                <p className="font-semibold text-slate-100 text-lg">{detail.display_name}</p>
                <p className="text-sm text-slate-400">{detail.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                ['Status', statusBadge(detail.account_status, detail.role)],
                ['Joined', format(new Date(detail.created_at), 'MMM d, yyyy')],
                ['Challenges created', detailLoading ? '…' : detail.challengesCreated],
                ['Participations', detailLoading ? '…' : detail.participations],
              ].map(([k, v]) => (
                <div key={String(k)} className="bg-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">{k}</p>
                  <div className="text-sm font-medium text-slate-200">{v}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {detail.account_status === 'blocked'
                ? <ModalBtn onClick={() => { setDetail(null); startConfirm('unblock', detail); }} color="bg-emerald-600 hover:bg-emerald-700">Unblock</ModalBtn>
                : <ModalBtn onClick={() => { setDetail(null); startConfirm('block', detail); }} color="bg-amber-600 hover:bg-amber-700">Block</ModalBtn>
              }
              {detail.role === 'admin'
                ? <ModalBtn onClick={() => { setDetail(null); startConfirm('removeAdmin', detail); }} color="bg-slate-700 hover:bg-slate-600">Revoke Admin</ModalBtn>
                : <ModalBtn onClick={() => { setDetail(null); startConfirm('makeAdmin', detail); }} color="bg-indigo-600 hover:bg-indigo-700">Make Admin</ModalBtn>
              }
              <ModalBtn onClick={() => { setDetail(null); startConfirm('delete', detail); }} color="bg-red-600 hover:bg-red-700">Delete User</ModalBtn>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirm.open}
        title={confirm.type === 'delete' ? 'Delete User' : confirm.type === 'block' ? 'Block User' : confirm.type === 'unblock' ? 'Unblock User' : confirm.type === 'makeAdmin' ? 'Grant Admin' : 'Revoke Admin'}
        message={confirmMessages[confirm.type]}
        confirmLabel={confirm.type === 'delete' ? 'Delete' : confirm.type === 'block' ? 'Block' : 'Confirm'}
        danger={confirm.type === 'delete' || confirm.type === 'block'}
        loading={confirm.loading}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />
    </div>
  );
}

function ActionBtn({ onClick, icon, label, color }: { onClick: () => void; icon: React.ReactNode; label: string; color: string }) {
  return (
    <button onClick={onClick} title={label} className={`p-1.5 rounded-lg transition-colors ${color}`}>{icon}</button>
  );
}

function ModalBtn({ onClick, color, children }: { onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors ${color}`}>{children}</button>
  );
}
