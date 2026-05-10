import { useEffect, useState, useMemo, FormEvent } from 'react';
import { Bell, Send, Users, User, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  profiles: { display_name: string } | null;
}

interface Profile { id: string; display_name: string; email: string; }

const PAGE_SIZE = 25;

export default function Notifications() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'history' | 'send'>('send');
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Send form
  const [sendMode, setSendMode] = useState<'all' | 'specific'>('all');
  const [targetSearch, setTargetSearch] = useState('');
  const [targetUsers, setTargetUsers] = useState<Profile[]>([]);
  const [targetSelected, setTargetSelected] = useState<Profile[]>([]);
  const [sendTitle, setSendTitle] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendType, setSendType] = useState('admin');
  const [sending, setSending] = useState(false);

  async function loadHistory() {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('id, user_id, title, message, type, is_read, created_at, profiles(display_name)')
      .eq('type', 'admin')
      .order('created_at', { ascending: false })
      .limit(200);
    setNotifications((data ?? []).map(n => ({
      ...n,
      profiles: Array.isArray(n.profiles) ? n.profiles[0] ?? null : n.profiles,
    })) as NotificationRow[]);
    setLoading(false);
  }

  useEffect(() => { loadHistory(); }, []);

  // Search users for specific send
  useEffect(() => {
    if (targetSearch.length < 2) { setTargetUsers([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id, display_name, email')
        .or(`display_name.ilike.%${targetSearch}%,email.ilike.%${targetSearch}%`).limit(6);
      setTargetUsers((data ?? []).filter(u => !targetSelected.find(s => s.id === u.id)) as Profile[]);
    }, 300);
    return () => clearTimeout(timer);
  }, [targetSearch, targetSelected]);

  function addTarget(user: Profile) {
    setTargetSelected(prev => [...prev, user]);
    setTargetSearch('');
    setTargetUsers([]);
  }

  function removeTarget(id: string) {
    setTargetSelected(prev => prev.filter(u => u.id !== id));
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!sendTitle.trim() || !sendMessage.trim()) { toast('error', 'Title and message are required'); return; }
    if (sendMode === 'specific' && targetSelected.length === 0) { toast('error', 'Select at least one user'); return; }
    setSending(true);
    try {
      let userIds: string[] = [];
      if (sendMode === 'all') {
        const { data: profiles } = await supabase.from('profiles').select('id').eq('account_status', 'active');
        userIds = (profiles ?? []).map(p => p.id);
      } else {
        userIds = targetSelected.map(u => u.id);
      }

      // Insert in batches of 100
      for (let i = 0; i < userIds.length; i += 100) {
        const batch = userIds.slice(i, i + 100).map(user_id => ({
          user_id,
          title: sendTitle,
          message: sendMessage,
          type: 'admin',
          is_read: false,
        }));
        await supabase.from('notifications').insert(batch);
      }
      toast('success', `Notification sent to ${userIds.length} user${userIds.length !== 1 ? 's' : ''}`, sendTitle);
      setSendTitle('');
      setSendMessage('');
      setTargetSelected([]);
      await loadHistory();
      setTab('history');
    } catch {
      toast('error', 'Failed to send notification');
    }
    setSending(false);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return notifications.filter(n =>
      !q || n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q) || n.profiles?.display_name.toLowerCase().includes(q)
    );
  }, [notifications, search]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const adminSent = notifications.length;
  const readCount = notifications.filter(n => n.is_read).length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Admin Notifications Sent', value: adminSent, color: 'text-indigo-400' },
          { label: 'Read', value: readCount, color: 'text-emerald-400' },
          { label: 'Unread', value: adminSent - readCount, color: 'text-amber-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-2">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {(['send', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {t === 'send' ? 'Send Notification' : 'History'}
          </button>
        ))}
      </div>

      {tab === 'send' && (
        <div className="max-w-lg">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-semibold text-slate-100 mb-5">Send Notification</h2>
            <form onSubmit={handleSend} className="space-y-4">
              {/* Recipients */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">Recipients</label>
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => setSendMode('all')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${sendMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                    <Users className="w-4 h-4" /> All active users
                  </button>
                  <button type="button" onClick={() => setSendMode('specific')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${sendMode === 'specific' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                    <User className="w-4 h-4" /> Specific users
                  </button>
                </div>
                {sendMode === 'specific' && (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input value={targetSearch} onChange={e => setTargetSearch(e.target.value)}
                        placeholder="Search users to add…"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      {targetUsers.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-10 shadow-xl">
                          {targetUsers.map(u => (
                            <button key={u.id} type="button" onClick={() => addTarget(u)}
                              className="w-full px-3 py-2.5 text-left hover:bg-slate-700 transition-colors">
                              <p className="text-sm text-slate-200">{u.display_name}</p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {targetSelected.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {targetSelected.map(u => (
                          <div key={u.id} className="flex items-center gap-1.5 bg-indigo-600/20 border border-indigo-500/30 rounded-full px-3 py-1 text-xs text-indigo-300">
                            {u.display_name}
                            <button type="button" onClick={() => removeTarget(u.id)} className="text-indigo-400 hover:text-white">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Notification type</label>
                <select value={sendType} onChange={e => setSendType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="admin">Admin announcement</option>
                  <option value="system">System notification</option>
                  <option value="promotion">Promotion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Title</label>
                <input value={sendTitle} onChange={e => setSendTitle(e.target.value)} required
                  placeholder="Notification title"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Message</label>
                <textarea value={sendMessage} onChange={e => setSendMessage(e.target.value)} required rows={3}
                  placeholder="Your message to users…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              <button type="submit" disabled={sending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                {sending ? 'Sending…' : sendMode === 'all' ? 'Send to all users' : `Send to ${targetSelected.length} user${targetSelected.length !== 1 ? 's' : ''}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search notifications…"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Recipient', 'Title', 'Message', 'Status', 'Sent'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-500">Loading…</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <Bell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500">No admin notifications sent yet</p>
                      </td>
                    </tr>
                  ) : paginated.map(n => (
                    <tr key={n.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3 text-slate-300">{n.profiles?.display_name ?? '—'}</td>
                      <td className="px-5 py-3 font-medium text-slate-200">{n.title}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs max-w-[250px] truncate">{n.message}</td>
                      <td className="px-5 py-3">
                        {n.is_read
                          ? <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">Read</span>
                          : <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400">Unread</span>
                        }
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{format(new Date(n.created_at), 'MMM d, yyyy HH:mm')}</td>
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
    </div>
  );
}
