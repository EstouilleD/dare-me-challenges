import { useEffect, useState, useMemo } from 'react';
import { Search, Trash2, X, ChevronLeft, ChevronRight, Image, Video, FileText, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

interface Proof {
  id: string;
  image_url: string | null;
  video_url: string | null;
  text: string | null;
  quantity_value: number | null;
  created_at: string;
  challenge_id: string;
  challenges: { title: string } | null;
  participations: {
    user_id: string;
    profiles: { display_name: string; email: string } | null;
  } | null;
}

interface ModerationChallenge {
  id: string;
  title: string;
  description: string;
  demo_photo_url: string | null;
  demo_video_url: string | null;
  status: string;
  is_public: boolean | null;
  created_at: string;
  profiles: { display_name: string; email: string } | null;
  challenge_types: { name: string; icon: string } | null;
}

const PAGE_SIZE = 20;

type Tab = 'proofs' | 'challenges';
type MediaFilter = 'all' | 'image' | 'video' | 'text';

export default function Moderation() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('proofs');

  // Proofs state
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [proofsLoading, setProofsLoading] = useState(true);
  const [proofSearch, setProofSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [proofPage, setProofPage] = useState(0);
  const [proofDetail, setProofDetail] = useState<Proof | null>(null);
  const [proofConfirm, setProofConfirm] = useState<{ open: boolean; proof: Proof | null; loading: boolean }>({
    open: false, proof: null, loading: false,
  });

  // Challenges state
  const [challenges, setChallenges] = useState<ModerationChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [challengeSearch, setChallengeSearch] = useState('');
  const [mediaOnlyFilter, setMediaOnlyFilter] = useState(false);
  const [challengePage, setChallengePage] = useState(0);
  const [challengeDetail, setChallengeDetail] = useState<ModerationChallenge | null>(null);
  const [challengeConfirm, setChallengeConfirm] = useState<{ open: boolean; challenge: ModerationChallenge | null; loading: boolean }>({
    open: false, challenge: null, loading: false,
  });

  async function loadProofs() {
    setProofsLoading(true);
    const { data, error } = await supabase
      .from('proofs')
      .select(`
        id, image_url, video_url, text, quantity_value, created_at, challenge_id,
        challenges(title),
        participations(user_id, profiles(display_name, email))
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Moderation/proofs]', error);
      toast('error', `Failed to load proofs: ${error.message}`);
    } else {
      setProofs((data ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        challenges: Array.isArray(p.challenges) ? p.challenges[0] ?? null : p.challenges,
        participations: Array.isArray(p.participations) ? p.participations[0] ?? null : p.participations,
      })) as Proof[]);
    }
    setProofsLoading(false);
  }

  async function loadChallenges() {
    setChallengesLoading(true);
    const { data, error } = await supabase
      .from('challenges')
      .select(`
        id, title, description, demo_photo_url, demo_video_url, status, is_public, created_at,
        profiles(display_name, email),
        challenge_types(name, icon)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Moderation/challenges]', error);
      toast('error', `Failed to load challenges: ${error.message}`);
    } else {
      setChallenges((data ?? []).map((c: Record<string, unknown>) => ({
        ...c,
        profiles: Array.isArray(c.profiles) ? c.profiles[0] ?? null : c.profiles,
        challenge_types: Array.isArray(c.challenge_types) ? c.challenge_types[0] ?? null : c.challenge_types,
      })) as ModerationChallenge[]);
    }
    setChallengesLoading(false);
  }

  useEffect(() => { loadProofs(); loadChallenges(); }, []);

  // Filtered proofs
  const filteredProofs = useMemo(() => {
    const q = proofSearch.toLowerCase();
    return proofs.filter(p => {
      const matchSearch = !q
        || p.challenges?.title.toLowerCase().includes(q)
        || p.participations?.profiles?.display_name.toLowerCase().includes(q);
      const matchMedia = mediaFilter === 'all'
        || (mediaFilter === 'image' && !!p.image_url)
        || (mediaFilter === 'video' && !!p.video_url)
        || (mediaFilter === 'text' && !p.image_url && !p.video_url);
      return matchSearch && matchMedia;
    });
  }, [proofs, proofSearch, mediaFilter]);

  // Filtered challenges
  const filteredChallenges = useMemo(() => {
    const q = challengeSearch.toLowerCase();
    return challenges.filter(c => {
      const matchSearch = !q
        || c.title.toLowerCase().includes(q)
        || c.profiles?.display_name.toLowerCase().includes(q);
      const matchMedia = !mediaOnlyFilter || !!c.demo_photo_url || !!c.demo_video_url;
      return matchSearch && matchMedia;
    });
  }, [challenges, challengeSearch, mediaOnlyFilter]);

  const proofPages = Math.ceil(filteredProofs.length / PAGE_SIZE);
  const paginatedProofs = filteredProofs.slice(proofPage * PAGE_SIZE, (proofPage + 1) * PAGE_SIZE);

  const challengePages = Math.ceil(filteredChallenges.length / PAGE_SIZE);
  const paginatedChallenges = filteredChallenges.slice(challengePage * PAGE_SIZE, (challengePage + 1) * PAGE_SIZE);

  async function handleDeleteProof() {
    if (!proofConfirm.proof) return;
    setProofConfirm(c => ({ ...c, loading: true }));
    const { error } = await supabase.from('proofs').delete().eq('id', proofConfirm.proof.id);
    if (error) {
      toast('error', 'Failed to delete proof');
    } else {
      toast('success', 'Proof deleted');
      setProofDetail(null);
      await loadProofs();
    }
    setProofConfirm({ open: false, proof: null, loading: false });
  }

  async function handleDeleteChallenge() {
    if (!challengeConfirm.challenge) return;
    setChallengeConfirm(c => ({ ...c, loading: true }));
    const { error } = await supabase.from('challenges').delete().eq('id', challengeConfirm.challenge.id);
    if (error) {
      toast('error', 'Failed to delete challenge');
    } else {
      toast('success', `Challenge "${challengeConfirm.challenge.title}" deleted`);
      setChallengeDetail(null);
      await loadChallenges();
    }
    setChallengeConfirm({ open: false, challenge: null, loading: false });
  }

  const mediaIcon = (p: Proof) => {
    if (p.image_url) return <Image className="w-3.5 h-3.5 text-blue-400" />;
    if (p.video_url) return <Video className="w-3.5 h-3.5 text-purple-400" />;
    return <FileText className="w-3.5 h-3.5 text-slate-400" />;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-emerald-500/15 text-emerald-400',
      upcoming: 'bg-indigo-500/15 text-indigo-400',
      finished: 'bg-blue-500/15 text-blue-400',
      cancelled: 'bg-slate-700 text-slate-400',
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[status] ?? 'bg-slate-700 text-slate-400'}`}>{status}</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400" />
        <h1 className="text-lg font-bold text-slate-100">Content Moderation</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {(['proofs', 'challenges'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
            {t === 'proofs' && <span className="ml-2 text-xs opacity-70">{proofs.length}</span>}
            {t === 'challenges' && <span className="ml-2 text-xs opacity-70">{challenges.length}</span>}
          </button>
        ))}
      </div>

      {/* ── PROOFS TAB ── */}
      {tab === 'proofs' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={proofSearch}
                onChange={e => { setProofSearch(e.target.value); setProofPage(0); }}
                placeholder="Search by challenge or user…"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select value={mediaFilter} onChange={e => { setMediaFilter(e.target.value as MediaFilter); setProofPage(0); }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">All types</option>
              <option value="image">Images only</option>
              <option value="video">Videos only</option>
              <option value="text">Text only</option>
            </select>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800">
              <span className="text-sm font-medium text-slate-300">{filteredProofs.length.toLocaleString()} proofs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Preview', 'Type', 'Challenge', 'Submitted by', 'Text', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {proofsLoading ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-500">Loading…</td></tr>
                  ) : paginatedProofs.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-500">No proofs found</td></tr>
                  ) : paginatedProofs.map(p => (
                    <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt="proof"
                            className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setProofDetail(p)}
                          />
                        ) : p.video_url ? (
                          <button onClick={() => setProofDetail(p)}
                            className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors">
                            <Video className="w-6 h-6 text-purple-400" />
                          </button>
                        ) : (
                          <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-slate-500" />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">{mediaIcon(p)}</td>
                      <td className="px-5 py-3 text-slate-300 text-xs max-w-[160px] truncate">{p.challenges?.title ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{p.participations?.profiles?.display_name ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs max-w-[180px] truncate">{p.text ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{format(new Date(p.created_at), 'MMM d, yyyy')}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setProofDetail(p)} title="View" className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors">
                            <Image className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setProofConfirm({ open: true, proof: p, loading: false })} title="Delete" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {proofPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between text-sm">
                <span className="text-slate-500">Page {proofPage + 1} of {proofPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setProofPage(p => Math.max(0, p - 1))} disabled={proofPage === 0} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setProofPage(p => Math.min(proofPages - 1, p + 1))} disabled={proofPage >= proofPages - 1} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>

          {/* Proof detail modal */}
          {proofDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80" onClick={() => setProofDetail(null)} />
              <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                <button onClick={() => setProofDetail(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
                <h2 className="font-semibold text-slate-100 text-lg mb-4">Proof Review</h2>

                {proofDetail.image_url && (
                  <img src={proofDetail.image_url} alt="proof" className="w-full rounded-xl mb-4 object-contain max-h-64" />
                )}
                {proofDetail.video_url && (
                  <video src={proofDetail.video_url} controls className="w-full rounded-xl mb-4 max-h-64" />
                )}

                <div className="space-y-2 mb-5">
                  {[
                    ['Challenge', proofDetail.challenges?.title ?? '—'],
                    ['Submitted by', proofDetail.participations?.profiles?.display_name ?? '—'],
                    ['Email', proofDetail.participations?.profiles?.email ?? '—'],
                    ['Date', format(new Date(proofDetail.created_at), 'MMM d, yyyy HH:mm')],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-slate-800 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-0.5">{k}</p>
                      <p className="text-sm font-medium text-slate-200">{v}</p>
                    </div>
                  ))}
                  {proofDetail.text && (
                    <div className="bg-slate-800 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-0.5">Text</p>
                      <p className="text-sm text-slate-300">{proofDetail.text}</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { setProofDetail(null); setProofConfirm({ open: true, proof: proofDetail, loading: false }); }}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Delete Proof
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CHALLENGES TAB ── */}
      {tab === 'challenges' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={challengeSearch}
                onChange={e => { setChallengeSearch(e.target.value); setChallengePage(0); }}
                placeholder="Search challenges…"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <label className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mediaOnlyFilter}
                onChange={e => { setMediaOnlyFilter(e.target.checked); setChallengePage(0); }}
                className="accent-indigo-500"
              />
              With demo media only
            </label>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800">
              <span className="text-sm font-medium text-slate-300">{filteredChallenges.length.toLocaleString()} challenges</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Demo', 'Challenge', 'Creator', 'Type', 'Status', 'Created', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {challengesLoading ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-500">Loading…</td></tr>
                  ) : paginatedChallenges.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-500">No challenges found</td></tr>
                  ) : paginatedChallenges.map(c => (
                    <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3">
                        {c.demo_photo_url ? (
                          <img
                            src={c.demo_photo_url}
                            alt="demo"
                            className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setChallengeDetail(c)}
                          />
                        ) : c.demo_video_url ? (
                          <button onClick={() => setChallengeDetail(c)}
                            className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors">
                            <Video className="w-6 h-6 text-purple-400" />
                          </button>
                        ) : (
                          <div className="w-16 h-16 bg-slate-800/50 rounded-lg flex items-center justify-center">
                            <span className="text-xl">{c.challenge_types?.icon ?? '—'}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 max-w-xs">
                        <p className="font-medium text-slate-200 truncate">{c.title}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{c.description}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{c.profiles?.display_name ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{c.challenge_types?.icon} {c.challenge_types?.name}</td>
                      <td className="px-5 py-3">{statusBadge(c.status)}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{format(new Date(c.created_at), 'MMM d, yyyy')}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setChallengeDetail(c)} title="View" className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors">
                            <Image className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setChallengeConfirm({ open: true, challenge: c, loading: false })} title="Delete" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {challengePages > 1 && (
              <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between text-sm">
                <span className="text-slate-500">Page {challengePage + 1} of {challengePages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setChallengePage(p => Math.max(0, p - 1))} disabled={challengePage === 0} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setChallengePage(p => Math.min(challengePages - 1, p + 1))} disabled={challengePage >= challengePages - 1} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>

          {/* Challenge detail modal */}
          {challengeDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80" onClick={() => setChallengeDetail(null)} />
              <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                <button onClick={() => setChallengeDetail(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
                <h2 className="font-semibold text-slate-100 text-lg mb-1">{challengeDetail.title}</h2>
                <p className="text-sm text-slate-400 mb-4">{challengeDetail.description}</p>

                {challengeDetail.demo_photo_url && (
                  <img src={challengeDetail.demo_photo_url} alt="demo" className="w-full rounded-xl mb-4 object-contain max-h-64" />
                )}
                {challengeDetail.demo_video_url && (
                  <video src={challengeDetail.demo_video_url} controls className="w-full rounded-xl mb-4 max-h-64" />
                )}

                <div className="grid grid-cols-2 gap-2 mb-5">
                  {[
                    ['Creator', challengeDetail.profiles?.display_name ?? '—'],
                    ['Email', challengeDetail.profiles?.email ?? '—'],
                    ['Type', `${challengeDetail.challenge_types?.icon ?? ''} ${challengeDetail.challenge_types?.name ?? '—'}`],
                    ['Status', challengeDetail.status],
                    ['Visibility', challengeDetail.is_public ? 'Public' : 'Private'],
                    ['Created', format(new Date(challengeDetail.created_at), 'MMM d, yyyy')],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-slate-800 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-0.5">{k}</p>
                      <p className="text-sm font-medium text-slate-200 truncate">{v}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => { setChallengeDetail(null); setChallengeConfirm({ open: true, challenge: challengeDetail, loading: false }); }}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Delete Challenge
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={proofConfirm.open}
        title="Delete Proof"
        message="Permanently delete this proof submission? This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={proofConfirm.loading}
        onConfirm={handleDeleteProof}
        onCancel={() => setProofConfirm(c => ({ ...c, open: false }))}
      />

      <ConfirmModal
        open={challengeConfirm.open}
        title="Delete Challenge"
        message={`Permanently delete "${challengeConfirm.challenge?.title}"? This will remove all participations and proofs.`}
        confirmLabel="Delete"
        danger
        loading={challengeConfirm.loading}
        onConfirm={handleDeleteChallenge}
        onCancel={() => setChallengeConfirm(c => ({ ...c, open: false }))}
      />
    </div>
  );
}
