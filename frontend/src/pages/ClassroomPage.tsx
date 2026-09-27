import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, Volume2, VolumeX,
  MessageSquare, PhoneOff, Globe, Clock, Users,
  ArrowLeft, Wifi, AlertCircle, CheckCircle,
} from 'lucide-react';
import { ClassroomDto, ClassState } from '@codeyoung/shared';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { CYLogo } from '@/components/ui/CYLogo';

// ── Countdown hook ────────────────────────────────────────────────────────────

function useCountdown(targetUtc: string) {
  const [diff, setDiff] = useState(() => new Date(targetUtc).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(new Date(targetUtc).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetUtc]);
  const total = Math.max(0, diff);
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1_000);
  return { h, m, s, done: total === 0 };
}

// ── Elapsed timer ─────────────────────────────────────────────────────────────

function useElapsed(startUtc: string, active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setElapsed(Date.now() - new Date(startUtc).getTime()), 1000);
    return () => clearInterval(id);
  }, [startUtc, active]);
  const m = Math.floor(elapsed / 60_000);
  const s = Math.floor((elapsed % 60_000) / 1_000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Initials avatar ───────────────────────────────────────────────────────────

function Avatar({ name, size = 'md', color = 'brand' }: { name: string; size?: 'sm' | 'md' | 'lg'; color?: 'brand' | 'stone' }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const sz = size === 'lg' ? 'w-24 h-24 text-3xl' : size === 'md' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm';
  const bg = color === 'brand' ? 'bg-brand-100 text-brand-700' : 'bg-stone-100 text-stone-600';
  return (
    <div className={`${sz} ${bg} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────────

interface ChatMsg { from: string; text: string; ts: string }

function ChatPanel({ userName, onClose }: { userName: string; onClose: () => void }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { from: 'System', text: 'Welcome to your CodeYoung trial class! 🎉', ts: new Date().toLocaleTimeString() },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = () => {
    if (!input.trim()) return;
    setMsgs(m => [...m, { from: userName, text: input.trim(), ts: new Date().toLocaleTimeString() }]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-stone-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <span className="font-semibold text-stone-800 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-500" /> Chat
        </span>
        <button onClick={onClose} className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.from === userName ? 'items-end' : 'items-start'}`}>
            <span className="text-xs text-stone-400 mb-0.5">{m.from} · {m.ts}</span>
            <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${
              m.from === 'System' ? 'bg-brand-50 text-brand-800 italic' :
              m.from === userName ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-800'
            }`}>{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-stone-100 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Type a message…"
          autoComplete="off"
          className="flex-1 px-3 py-2 text-sm text-stone-900 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button onClick={send} className="px-3 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600">Send</button>
      </div>
    </div>
  );
}

// ── Upcoming state ────────────────────────────────────────────────────────────

function UpcomingView({ classroom }: { classroom: ClassroomDto }) {
  const { user } = useAuth();
  const isParent = user?.role === 'PARENT';
  const myTime = isParent ? classroom.parent : classroom.mentor;
  const otherTime = isParent ? classroom.mentor : classroom.parent;
  const otherLabel = isParent ? 'Mentor' : 'Parent';
  const { h, m, s } = useCountdown(classroom.startUtc);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-sm font-medium">
          <Clock className="w-4 h-4" /> Upcoming
        </div>
        <h2 className="text-2xl font-bold text-stone-900">Your trial class starts soon</h2>
        <p className="text-stone-500">Get ready — your CodeYoung trial class is scheduled for:</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
        className="card p-8 w-full max-w-md space-y-4">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium mb-1">Your time</p>
          <p className="text-2xl font-bold text-stone-900">{myTime.localStart} — {myTime.localEnd}</p>
          <p className="text-stone-500 text-sm">{myTime.localDate}</p>
          <p className="text-xs text-stone-400 flex items-center justify-center gap-1 mt-1">
            <Globe className="w-3 h-3" />{myTime.timezone}
          </p>
        </div>
        <div className="border-t border-stone-100 pt-4">
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium mb-1">{otherLabel}'s time</p>
          <p className="font-semibold text-stone-700">{otherTime.localStart} — {otherTime.localEnd}</p>
          <p className="text-xs text-stone-400 flex items-center justify-center gap-1 mt-1">
            <Globe className="w-3 h-3" />{otherTime.timezone}
          </p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="flex items-center gap-4 text-stone-800">
        {[{ v: h, l: 'hours' }, { v: m, l: 'min' }, { v: s, l: 'sec' }].map(({ v, l }) => (
          <div key={l} className="text-center">
            <div className="text-4xl font-bold tabular-nums">{String(v).padStart(2, '0')}</div>
            <div className="text-xs text-stone-400 uppercase tracking-wide">{l}</div>
          </div>
        ))}
      </motion.div>

      <button disabled className="btn-primary opacity-50 cursor-not-allowed">
        <Clock className="w-4 h-4" /> Starts in {h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`}
      </button>
    </div>
  );
}

// ── Ended state ───────────────────────────────────────────────────────────────

function EndedView({ classroom }: { classroom: ClassroomDto }) {
  const { user } = useAuth();
  const dashPath = user?.role === 'MENTOR' ? '/mentor' : '/parent';
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900">Trial class completed</h2>
        <p className="text-stone-500 max-w-sm">
          This class took place on {classroom.parent.localDate}.<br />
          {classroom.parent.localStart} — {classroom.parent.localEnd} ({classroom.parent.timezone})
        </p>
      </motion.div>
      <div className="card p-5 w-full max-w-sm text-left space-y-3">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium">Mentor</p>
          <p className="font-semibold text-stone-800">{classroom.mentor.name}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium">Parent</p>
          <p className="font-semibold text-stone-800">{classroom.parent.name}</p>
        </div>
      </div>
      <Link to={dashPath} className="btn-secondary">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>
    </div>
  );
}

// ── Live classroom ────────────────────────────────────────────────────────────

function LiveClassroom({ classroom }: { classroom: ClassroomDto }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const isLive = classroom.state === 'LIVE';
  const elapsed = useElapsed(classroom.startUtc, isLive);
  const dashPath = user?.role === 'MENTOR' ? '/mentor' : '/parent';
  const userName = user?.name ?? 'You';

  const handleLeave = useCallback(() => {
    navigate(dashPath);
  }, [navigate, dashPath]);

  return (
    <div className="flex flex-col h-screen bg-stone-950 text-white overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-900 border-b border-stone-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <CYLogo className="w-7 h-7" />
          <div>
            <p className="font-semibold text-sm">CodeYoung Trial Class</p>
            <p className="text-xs text-stone-400">{classroom.parent.localDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1 rounded-full text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
              LIVE · {elapsed}
            </div>
          )}
          {!isLive && (
            <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-medium">
              <Clock className="w-3 h-3" /> Starting soon
            </div>
          )}
          <div className="flex items-center gap-1 text-green-400 text-xs">
            <Wifi className="w-3.5 h-3.5" /> Connected
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
            {/* Mentor tile */}
            <div className="relative bg-stone-800 rounded-2xl overflow-hidden flex items-center justify-center">
              {camOn ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-stone-700 to-stone-900">
                  <Avatar name={classroom.mentor.name} size="lg" color="brand" />
                  <p className="mt-3 text-sm font-medium text-stone-300">Camera preview</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3">
                  <Avatar name={classroom.mentor.name} size="lg" color="brand" />
                  <p className="text-stone-400 text-xs">Camera off</p>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5">
                {micOn ? <Mic className="w-3 h-3 text-green-400" /> : <MicOff className="w-3 h-3 text-red-400" />}
                {classroom.mentor.name}
              </div>
              <div className="absolute top-3 right-3 text-xs text-stone-400 bg-black/40 px-2 py-0.5 rounded">
                Mentor
              </div>
            </div>

            {/* Parent tile */}
            <div className="relative bg-stone-800 rounded-2xl overflow-hidden flex items-center justify-center">
              <div className="flex flex-col items-center justify-center gap-3">
                <Avatar name={classroom.parent.name} size="lg" color="stone" />
                {!camOn && <p className="text-stone-400 text-xs">Camera off</p>}
              </div>
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5">
                <Mic className="w-3 h-3 text-green-400" />
                {classroom.parent.name} (You)
              </div>
              <div className="absolute top-3 right-3 text-xs text-stone-400 bg-black/40 px-2 py-0.5 rounded">
                Parent
              </div>
            </div>
          </div>

          {/* Info strip */}
          <div className="flex-shrink-0 flex flex-wrap items-center gap-4 bg-stone-900 rounded-xl px-4 py-3 text-xs text-stone-400">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-400" />
              Parent: {classroom.parent.localStart} ({classroom.parent.timezone})
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-400" />
              Mentor: {classroom.mentor.localStart} ({classroom.mentor.timezone})
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> 2 participants
            </span>
          </div>

          {/* Controls */}
          <div className="flex-shrink-0 flex items-center justify-center gap-3 pb-2">
            <ControlBtn
              active={micOn}
              onIcon={<Mic className="w-5 h-5" />}
              offIcon={<MicOff className="w-5 h-5" />}
              label={micOn ? 'Mute' : 'Unmute'}
              onClick={() => setMicOn(v => !v)}
            />
            <ControlBtn
              active={camOn}
              onIcon={<Video className="w-5 h-5" />}
              offIcon={<VideoOff className="w-5 h-5" />}
              label={camOn ? 'Camera' : 'Camera'}
              onClick={() => setCamOn(v => !v)}
            />
            <ControlBtn
              active={speakerOn}
              onIcon={<Volume2 className="w-5 h-5" />}
              offIcon={<VolumeX className="w-5 h-5" />}
              label={speakerOn ? 'Speaker' : 'Speaker'}
              onClick={() => setSpeakerOn(v => !v)}
            />
            <ControlBtn
              active={chatOpen}
              onIcon={<MessageSquare className="w-5 h-5" />}
              offIcon={<MessageSquare className="w-5 h-5" />}
              label="Chat"
              onClick={() => setChatOpen(v => !v)}
              highlight={chatOpen}
            />
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="flex flex-col items-center gap-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="text-xs font-medium">Leave</span>
            </button>
          </div>
        </div>

        {/* Chat panel */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              className="w-80 flex-shrink-0 h-full"
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <ChatPanel userName={userName} onClose={() => setChatOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Leave confirmation */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 text-stone-900 space-y-4"
            >
              <h3 className="font-bold text-lg">Leave class?</h3>
              <p className="text-stone-500 text-sm">Are you sure you want to leave the trial class?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLeaveConfirm(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                  Stay
                </button>
                <button onClick={handleLeave} className="flex-1 py-2.5 text-sm bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors">
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ControlBtn({
  active, onIcon, offIcon, label, onClick, highlight,
}: {
  active: boolean; onIcon: React.ReactNode; offIcon: React.ReactNode;
  label: string; onClick: () => void; highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-colors ${
        highlight ? 'bg-brand-500 text-white' :
        active ? 'bg-stone-700 hover:bg-stone-600 text-white' : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
      }`}
    >
      {active ? onIcon : offIcon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

function NonLiveShell({ classroom, children }: { classroom: ClassroomDto; children: React.ReactNode }) {
  const { user } = useAuth();
  const dashPath = user?.role === 'MENTOR' ? '/mentor' : '/parent';
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link to={dashPath} className="p-2 rounded-lg hover:bg-stone-100 transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </Link>
          <div className="flex items-center gap-2">
            <CYLogo className="w-7 h-7" />
            <span className="font-bold text-stone-800">CodeYoung</span>
          </div>
          <span className="text-stone-400 text-sm hidden sm:block">Trial Class</span>
          <div className="ml-auto flex items-center gap-2 text-sm text-stone-500">
            <span className="font-medium text-stone-700">{classroom.mentor.name}</span>
            <span>&amp;</span>
            <span className="font-medium text-stone-700">{classroom.parent.name}</span>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export function ClassroomPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [classroom, setClassroom] = useState<ClassroomDto | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Poll every 15s to refresh state (UPCOMING → JOINABLE → LIVE → ENDED)
  const load = useCallback(async () => {
    if (!bookingId) return;
    try {
      const data = await api.getClassroom(bookingId);
      setClassroom(data);
      setError(null);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; status?: number };
      const status = e?.status ?? 500;
      const message = e?.error?.message ?? 'Could not load class.';
      setError({ status, message });
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [authLoading, user, load, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="space-y-3 w-72">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    const dashPath = user?.role === 'MENTOR' ? '/mentor' : '/parent';
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">
            {error.status === 403 ? 'Access Denied' : error.status === 404 ? 'Class Not Found' : 'Something went wrong'}
          </h2>
          <p className="text-stone-500 text-sm">{error.message}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={load} className="btn-secondary text-sm py-2">Retry</button>
            <Link to={dashPath} className="btn-primary text-sm py-2">Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!classroom) return null;

  const state: ClassState = classroom.state;

  if (state === 'LIVE' || state === 'JOINABLE') {
    return <LiveClassroom classroom={classroom} />;
  }

  if (state === 'ENDED') {
    return <NonLiveShell classroom={classroom}><EndedView classroom={classroom} /></NonLiveShell>;
  }

  return <NonLiveShell classroom={classroom}><UpcomingView classroom={classroom} /></NonLiveShell>;
}
