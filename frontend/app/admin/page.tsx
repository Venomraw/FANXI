'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Types ───────────────────────────────────────────────────────────────────

interface Stats {
  total_users: number;
  total_predictions: number;
  predictions_today: number;
  nudges_sent_24h: number;
  conversion_rate_24h: number;
  open_approval_queue: number;
  active_agents: number;
  critical_alerts: number;
}

interface AgentRunItem {
  id: number;
  agent: string;
  department: string;
  run_type: string;
  severity: number;
  findings_count?: number;
  findings?: Record<string, unknown>[];
  actions_taken: string[];
  escalated_to_queue: boolean;
  summary: string;
  created_at: string;
}

interface ApprovalItem {
  id: number;
  agent: string;
  action_type: string;
  action_data: Record<string, unknown>;
  severity: number;
  reason: string;
  status: string;
  created_at: string;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  country_allegiance: string;
  football_iq_points: number;
  rank_title: string;
  is_admin: boolean;
  is_banned: boolean;
}

interface MatchItem {
  id: number;
  home_team: string;
  home_flag: string;
  away_team: string;
  away_flag: string;
  kickoff: string;
  venue: string;
  round: string;
  group: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Agents', 'Queue', 'Matches', 'Users', 'Logs'] as const;
type Tab = (typeof TABS)[number];

type AuthFetchFn = (input: RequestInfo, init?: RequestInit) => Promise<Response>;
type ToastObj = { success: (m: string) => void; error: (m: string) => void; warning: (m: string) => void; info: (m: string) => void };

function severityDot(sev: number) {
  if (sev >= 80) return 'bg-red-500';
  if (sev >= 40) return 'bg-yellow-500';
  return 'bg-green-500';
}

function severityLabel(sev: number) {
  if (sev >= 80) return 'CRITICAL';
  if (sev >= 40) return 'WARNING';
  return 'INFO';
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

// ── Admin Page ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, authFetch, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (!user.is_admin) {
      toast.error('Admin access required');
      router.push('/hub');
    }
  }, [user, authLoading, router, toast]);

  if (authLoading || !user?.is_admin) {
    return (
      <div className="min-h-screen bg-[var(--dark)] flex items-center justify-center">
        <div className="text-white/40 font-sans">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark)] flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-60
        bg-black/60 backdrop-blur-xl border-r border-white/10
        flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-5 border-b border-white/10">
          <div className="font-display text-lg text-white tracking-wide">FanXI</div>
          <div className="text-red-500 text-xs font-sans font-semibold tracking-widest mt-0.5">ADMIN PANEL</div>
        </div>
        <nav className="flex-1 py-3">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSidebarOpen(false); }}
              className={`w-full text-left px-5 py-2.5 text-sm font-sans transition-colors ${
                activeTab === tab
                  ? 'text-red-400 bg-red-500/10 border-r-2 border-red-500'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
        <div className="p-5 border-t border-white/10">
          <button onClick={() => router.push('/hub')} className="text-white/40 hover:text-white text-sm font-sans transition-colors">
            &larr; Back to App
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/10">
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="text-red-500 text-xs font-sans font-semibold tracking-widest">ADMIN</span>
          <div className="w-6" />
        </div>
        <div className="p-4 lg:p-8">
          {activeTab === 'Overview' && <OverviewTab authFetch={authFetch} />}
          {activeTab === 'Agents' && <AgentsTab authFetch={authFetch} toast={toast} />}
          {activeTab === 'Queue' && <QueueTab authFetch={authFetch} toast={toast} />}
          {activeTab === 'Matches' && <MatchesTab authFetch={authFetch} />}
          {activeTab === 'Users' && <UsersTab authFetch={authFetch} toast={toast} />}
          {activeTab === 'Logs' && <LogsTab authFetch={authFetch} />}
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab({ authFetch }: { authFetch: AuthFetchFn }) {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/admin/stats`);
      if (res.ok) setStats(await res.json());
    } catch { /* network error */ }
  }, [authFetch]);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  if (!stats) return <div className="text-white/40 font-sans">Loading overview...</div>;

  const cards = [
    { label: 'Users', value: stats.total_users, sub: `${stats.predictions_today} preds today` },
    { label: 'Predictions', value: stats.total_predictions, sub: `${stats.predictions_today} today` },
    { label: 'Nudges (24h)', value: stats.nudges_sent_24h, sub: `${stats.conversion_rate_24h}% converted` },
    { label: 'Agents', value: stats.active_agents, sub: `${stats.critical_alerts} critical alert(s)` },
  ];

  return (
    <div>
      <h2 className="text-2xl font-display text-white mb-6">Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <div className="text-white/50 text-xs font-sans uppercase tracking-wider">{c.label}</div>
            <div className="text-3xl font-display text-white mt-1">{c.value.toLocaleString()}</div>
            <div className="text-white/30 text-xs font-sans mt-1">{c.sub}</div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <div className="text-white/50 text-xs font-sans uppercase tracking-wider mb-2">Approval Queue</div>
          <div className="text-2xl font-display text-white">{stats.open_approval_queue} pending</div>
        </Card>
        <Card>
          <div className="text-white/50 text-xs font-sans uppercase tracking-wider mb-2">Conversion Rate</div>
          <div className="text-2xl font-display text-white">{stats.conversion_rate_24h}%</div>
        </Card>
        <Card>
          <div className="text-white/50 text-xs font-sans uppercase tracking-wider mb-2">Critical Alerts</div>
          <div className={`text-2xl font-display ${stats.critical_alerts > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {stats.critical_alerts}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — AGENTS
// ═══════════════════════════════════════════════════════════════════════════════

const AGENTS = [
  { name: 'NATASHA', dept: 'Shield Division', schedule: 'watchdog 5m / scan 24h' },
  { name: 'RHODEY', dept: 'Engineering Corps', schedule: 'ci_scan 6h' },
  { name: 'VISION', dept: 'Intelligence Bureau', schedule: 'audit 24h / scouts 6h / h2h 12h' },
  { name: 'PIETRO', dept: 'Game Command', schedule: 'nudge 15m / conversion 90m' },
];

function AgentsTab({ authFetch, toast }: { authFetch: AuthFetchFn; toast: ToastObj }) {
  const [runs, setRuns] = useState<Record<string, AgentRunItem | null>>({});
  const [recentRuns, setRecentRuns] = useState<AgentRunItem[]>([]);
  const [running, setRunning] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    for (const agent of AGENTS) {
      try {
        const res = await authFetch(`${API}/agents/runs/${agent.name}?limit=1`);
        if (res.ok) {
          const data = await res.json();
          setRuns(prev => ({ ...prev, [agent.name]: data.runs?.[0] ?? null }));
        }
      } catch { /* ignore */ }
    }
    // Load recent activity feed
    try {
      const res = await authFetch(`${API}/agents/runs?limit=20`);
      if (res.ok) { const data = await res.json(); setRecentRuns(data.runs ?? []); }
    } catch { /* ignore */ }
  }, [authFetch]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  async function triggerAgent(name: string) {
    setRunning(name);
    try {
      const res = await authFetch(`${API}/agents/${name.toLowerCase()}/run`, { method: 'POST' });
      if (res.ok) { toast.success(`${name} completed`); loadRuns(); }
      else toast.error(`${name} trigger failed`);
    } catch { toast.error(`${name} trigger failed`); }
    finally { setRunning(null); }
  }

  return (
    <div>
      <h2 className="text-2xl font-display text-white mb-6">Agents</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {AGENTS.map((agent) => {
          const run = runs[agent.name];
          const sev = run?.severity ?? -1;
          const dotColor = sev < 0 ? 'bg-white/20' : severityDot(sev);
          return (
            <Card key={agent.name}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                  <span className="font-display text-white text-lg">{agent.name}</span>
                </div>
                <span className="text-white/30 text-xs font-sans">{agent.dept}</span>
              </div>
              {run ? (
                <>
                  <div className="text-white/50 text-xs font-sans mb-1">
                    Last run: {timeAgo(run.created_at)} &middot; Severity: {run.severity} ({severityLabel(run.severity)})
                  </div>
                  <div className="text-white/70 text-sm font-sans mb-3 line-clamp-2">{run.summary}</div>
                </>
              ) : (
                <div className="text-white/30 text-sm font-sans mb-3">Never run</div>
              )}
              <div className="text-white/20 text-xs font-mono mb-3">Schedule: {agent.schedule}</div>
              <button
                onClick={() => triggerAgent(agent.name)}
                disabled={running === agent.name}
                className="px-3 py-1.5 text-xs font-sans font-semibold rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {running === agent.name ? 'Running...' : 'Run Now'}
              </button>
            </Card>
          );
        })}
      </div>

      {/* Recent Agent Activity */}
      <div className="mt-8">
        <h3 className="text-lg font-display text-white mb-4">Recent Activity</h3>
        <Card className="!p-0 overflow-hidden">
          {recentRuns.length === 0 ? (
            <div className="text-white/30 text-sm font-sans text-center py-6">No agent runs yet</div>
          ) : (
            recentRuns.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${severityDot(r.severity)}`} />
                <span className="text-white/30 text-xs font-mono w-16 flex-shrink-0">{timeAgo(r.created_at)}</span>
                <span className="text-white font-sans text-sm w-20 flex-shrink-0">{r.agent}</span>
                <span className="text-white/50 text-sm font-sans truncate">{r.summary}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — APPROVAL QUEUE
// ═══════════════════════════════════════════════════════════════════════════════

function QueueTab({ authFetch, toast }: { authFetch: AuthFetchFn; toast: ToastObj }) {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/agents/approval-queue?status_filter=pending`);
      if (res.ok) { const data = await res.json(); setItems(data.items ?? []); }
    } catch { /* ignore */ }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  async function handleAction(id: number, action: 'approve' | 'reject') {
    if (!confirm(`Are you sure you want to ${action} this action?`)) return;
    try {
      const res = await authFetch(`${API}/agents/approval-queue/${id}/${action}`, { method: 'POST' });
      if (res.ok) { toast.success(`Action ${action}d`); setItems(prev => prev.filter(i => i.id !== id)); }
      else toast.error(`Failed to ${action}`);
    } catch { toast.error(`Failed to ${action}`); }
  }

  if (loading) return <div className="text-white/40 font-sans">Loading queue...</div>;

  return (
    <div>
      <h2 className="text-2xl font-display text-white mb-6">Approval Queue</h2>
      {items.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-green-400 text-lg font-sans">No pending approvals</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${severityDot(item.severity)}`} />
                  <span className="font-display text-white">{item.agent}</span>
                  <span className="text-white/30 text-xs font-sans">&middot; {item.action_type}</span>
                </div>
                <span className="text-white/30 text-xs font-sans">{timeAgo(item.created_at)}</span>
              </div>
              <p className="text-white/60 text-sm font-sans mb-4">{item.reason}</p>
              <div className="flex gap-2">
                <button onClick={() => handleAction(item.id, 'approve')}
                  className="px-4 py-1.5 text-xs font-sans font-semibold rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
                  Approve
                </button>
                <button onClick={() => handleAction(item.id, 'reject')}
                  className="px-4 py-1.5 text-xs font-sans font-semibold rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                  Reject
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — MATCHES
// ═══════════════════════════════════════════════════════════════════════════════

function MatchesTab({ authFetch }: { authFetch: AuthFetchFn }) {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [predCounts, setPredCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [matchRes, predRes] = await Promise.all([
        authFetch(`${API}/matches/all`),
        authFetch(`${API}/admin/matches`),
      ]);
      if (matchRes.ok) setMatches(await matchRes.json());
      if (predRes.ok) {
        const data = await predRes.json();
        const counts: Record<number, number> = {};
        for (const r of data) counts[r.match_id] = r.prediction_count;
        setPredCounts(counts);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-white/40 font-sans">Loading matches...</div>;

  return (
    <div>
      <h2 className="text-2xl font-display text-white mb-6">Matches</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {matches.slice(0, 24).map((m) => (
          <Card key={m.id} className="!p-4">
            <div className="text-white/30 text-xs font-sans mb-1">Group {m.group} &middot; {m.round}</div>
            <div className="flex items-center gap-2 mb-1">
              <span>{m.home_flag}</span>
              <span className="font-display text-white text-sm">{m.home_team}</span>
              <span className="text-white/30 text-xs font-sans mx-1">vs</span>
              <span className="font-display text-white text-sm">{m.away_team}</span>
              <span>{m.away_flag}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/30 text-xs font-sans">
                {new Date(m.kickoff).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &middot; {m.venue}
              </span>
              <span className="text-white/50 text-xs font-mono">{predCounts[m.id] ?? 0} preds</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5 — USERS
// ═══════════════════════════════════════════════════════════════════════════════

function UsersTab({ authFetch, toast }: { authFetch: AuthFetchFn; toast: ToastObj }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/admin/users?limit=20&offset=${page * 20}`);
      if (res.ok) { const data = await res.json(); setUsers(data.users ?? []); setTotal(data.total ?? 0); }
    } catch { /* ignore */ }
    setLoading(false);
  }, [authFetch, page]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  async function banUser(id: number, name: string) {
    if (!confirm(`Ban "${name}"? They will not be able to log in.`)) return;
    const res = await authFetch(`${API}/admin/users/${id}/ban`, { method: 'POST' }).catch(() => null);
    if (res?.ok) { toast.success(`${name} banned`); load(); } else toast.error('Ban failed');
  }

  async function unbanUser(id: number, name: string) {
    if (!confirm(`Unban "${name}"?`)) return;
    const res = await authFetch(`${API}/admin/users/${id}/unban`, { method: 'POST' }).catch(() => null);
    if (res?.ok) { toast.success(`${name} unbanned`); load(); } else toast.error('Unban failed');
  }

  async function toggleAdmin(id: number, name: string) {
    if (!confirm(`Toggle admin for "${name}"?`)) return;
    const res = await authFetch(`${API}/admin/users/${id}/toggle-admin`, { method: 'POST' }).catch(() => null);
    if (res?.ok) { toast.success(`Admin toggled for ${name}`); load(); }
    else { const err = await res?.json().catch(() => ({})); toast.error(err?.detail || 'Failed'); }
  }

  if (loading) return <div className="text-white/40 font-sans">Loading users...</div>;

  return (
    <div>
      <h2 className="text-2xl font-display text-white mb-6">Users ({total})</h2>
      <Card className="overflow-x-auto !p-0">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Username</th>
              <th className="text-left p-3 hidden md:table-cell">Nation</th>
              <th className="text-right p-3">IQ</th>
              <th className="text-right p-3 hidden md:table-cell">Rank</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${u.is_banned ? 'bg-red-500/10' : ''}`}>
                <td className="p-3 text-white/30">{page * 20 + i + 1}</td>
                <td className="p-3 text-white font-semibold">
                  {u.username}
                  {u.is_admin && <span className="ml-1.5 text-yellow-500 text-xs">ADMIN</span>}
                  {u.is_banned && <span className="ml-1.5 text-red-500 text-xs">BANNED</span>}
                </td>
                <td className="p-3 text-white/50 hidden md:table-cell">{u.country_allegiance}</td>
                <td className="p-3 text-white text-right font-mono">{u.football_iq_points}</td>
                <td className="p-3 text-white/50 text-right hidden md:table-cell">{u.rank_title}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {u.is_banned ? (
                      <button onClick={() => unbanUser(u.id, u.username)} className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 hover:bg-green-500/30">Unban</button>
                    ) : (
                      <button onClick={() => banUser(u.id, u.username)} className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">Ban</button>
                    )}
                    <button onClick={() => toggleAdmin(u.id, u.username)} className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">
                      {u.is_admin ? 'Revoke' : 'Admin'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="flex justify-center gap-2 mt-4">
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
          className="px-3 py-1 text-xs font-sans text-white/50 bg-white/5 rounded hover:bg-white/10 disabled:opacity-30">Prev</button>
        <span className="px-3 py-1 text-xs font-sans text-white/30">Page {page + 1} of {Math.ceil(total / 20) || 1}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 20 >= total}
          className="px-3 py-1 text-xs font-sans text-white/50 bg-white/5 rounded hover:bg-white/10 disabled:opacity-30">Next</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 6 — LOGS
// ═══════════════════════════════════════════════════════════════════════════════

function LogsTab({ authFetch }: { authFetch: AuthFetchFn }) {
  const [runs, setRuns] = useState<AgentRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: '30' });
    if (filter) params.set('agent', filter);
    try {
      const res = await authFetch(`${API}/agents/runs?${params}`);
      if (res.ok) { const data = await res.json(); setRuns(data.runs ?? []); }
    } catch { /* ignore */ }
    setLoading(false);
  }, [authFetch, filter]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  if (loading) return <div className="text-white/40 font-sans">Loading logs...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-display text-white">Agent Logs</h2>
        <div className="flex gap-2 flex-wrap">
          {['', 'NATASHA', 'RHODEY', 'VISION', 'PIETRO'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-sans rounded-lg transition-colors ${
                filter === f ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
              }`}>
              {f || 'All'}
            </button>
          ))}
        </div>
      </div>
      <Card className="!p-0 overflow-hidden">
        {runs.length === 0 ? (
          <div className="text-white/30 text-sm font-sans text-center py-8">No logs found</div>
        ) : (
          <div>
            {runs.map((r) => (
              <div key={r.id}>
                <button
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${severityDot(r.severity)}`} />
                  <span className="text-white/30 text-xs font-mono w-16 flex-shrink-0">{timeAgo(r.created_at)}</span>
                  <span className="text-white font-sans text-sm w-20 flex-shrink-0">{r.agent}</span>
                  <span className="text-white/50 text-sm font-sans truncate flex-1">{r.summary}</span>
                </button>
                {expanded === r.id && (
                  <div className="px-4 py-3 bg-black/30 border-b border-white/5">
                    <pre className="text-xs font-mono text-white/60 whitespace-pre-wrap overflow-x-auto max-h-80">
                      {JSON.stringify(r, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
