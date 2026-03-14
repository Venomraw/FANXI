'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface DashboardData {
  total_users: number;
  total_predictions: number;
  locked_predictions: number;
  scored_predictions: number;
}

interface MatchEntry {
  match_id: number;
  prediction_count: number;
  locked_count: number;
}

interface UserEntry {
  id: number;
  username: string;
  email: string;
  football_iq_points: number;
  rank_title: string;
  is_admin: boolean;
}

type Tab = 'dashboard' | 'matches' | 'users';

export default function AdminPage() {
  const { user, authFetch, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [scoreMatchId, setScoreMatchId] = useState('');
  const [refreshMatchId, setRefreshMatchId] = useState('');

  function log(msg: string) {
    setActionLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  }

  // Auth gate
  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  // Load data per tab
  useEffect(() => {
    if (!user) return;
    if (tab === 'dashboard') {
      authFetch(`${API}/admin/dashboard`).then(r => r.json()).then(setDashboard).catch(() => log('Failed to load dashboard'));
    } else if (tab === 'matches') {
      authFetch(`${API}/admin/matches`).then(r => r.json()).then(setMatches).catch(() => log('Failed to load matches'));
    } else if (tab === 'users') {
      authFetch(`${API}/admin/users?limit=100`).then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => log('Failed to load users'));
    }
  }, [tab, user]);

  async function handleRefreshMatch() {
    if (!refreshMatchId) return;
    try {
      const res = await authFetch(`${API}/admin/matches/${refreshMatchId}/refresh`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        log(`Refreshed match ${refreshMatchId}: ${data.home_team} vs ${data.away_team} (${data.status})`);
      } else {
        log(`Refresh failed: ${data.detail || 'Unknown error'}`);
      }
    } catch { log('Refresh request failed'); }
  }

  async function handleRerunScoring() {
    if (!scoreMatchId) return;
    try {
      const res = await authFetch(`${API}/admin/scoring/${scoreMatchId}/rerun`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        log(`Scoring rerun: ${data.reverted_to_locked} predictions reverted for match ${scoreMatchId}`);
      } else {
        log(`Scoring rerun failed: ${data.detail || 'Unknown error'}`);
      }
    } catch { log('Scoring rerun request failed'); }
  }

  async function handleRecalcLeaderboard() {
    try {
      const res = await authFetch(`${API}/admin/leaderboard/recalculate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        log(`Leaderboard recalculated: ${data.titles_updated} titles updated`);
      } else {
        log(`Recalc failed: ${data.detail || 'Unknown error'}`);
      }
    } catch { log('Leaderboard recalc failed'); }
  }

  async function handleToggleAdmin(userId: number, username: string) {
    try {
      const res = await authFetch(`${API}/admin/users/${userId}/toggle-admin`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        log(`Toggled admin for ${username}: is_admin=${data.is_admin}`);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: data.is_admin } : u));
      } else {
        log(`Toggle failed: ${data.detail || 'Unknown error'}`);
      }
    } catch { log('Toggle admin failed'); }
  }

  async function handleLockMatch(matchId: number) {
    try {
      const res = await authFetch(`${API}/admin/matches/${matchId}/lock`, { method: 'POST' });
      const data = await res.json();
      log(`Locked match ${matchId}: ${data.locked_count} predictions`);
    } catch { log(`Lock match ${matchId} failed`); }
  }

  async function handleUnlockMatch(matchId: number) {
    try {
      const res = await authFetch(`${API}/admin/matches/${matchId}/unlock`, { method: 'POST' });
      const data = await res.json();
      log(`Unlocked match ${matchId}: ${data.reverted_count} predictions reverted`);
    } catch { log(`Unlock match ${matchId} failed`); }
  }

  if (isLoading) return <div style={{ color: '#E8F5E8', padding: 40 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px', color: '#E8F5E8', fontFamily: 'var(--font-syne)' }}>
      <h1 style={{ fontFamily: 'var(--font-grotesk)', fontWeight: 600, fontSize: 40, marginBottom: 8 }}>
        Admin Console
      </h1>
      <p style={{ color: '#5A7A5A', fontSize: 14, marginBottom: 32 }}>
        Operator controls for FanXI. All actions are logged.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['dashboard', 'matches', 'users'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px',
              background: tab === t ? 'rgba(0,255,133,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${tab === t ? '#00FF85' : '#1E2D1E'}`,
              borderRadius: 8,
              color: tab === t ? '#00FF85' : '#5A7A5A',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {tab === 'dashboard' && dashboard && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Total Users', value: dashboard.total_users },
              { label: 'Total Predictions', value: dashboard.total_predictions },
              { label: 'Locked', value: dashboard.locked_predictions },
              { label: 'Scored', value: dashboard.scored_predictions },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1E2D1E', borderRadius: 12, padding: 20 }}>
                <div style={{ color: '#5A7A5A', fontSize: 12, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-grotesk)', fontWeight: 600, fontSize: 32 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500, marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={refreshMatchId}
                onChange={e => setRefreshMatchId(e.target.value)}
                placeholder="Match ID"
                style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #1E2D1E', borderRadius: 8, color: '#E8F5E8', fontSize: 13 }}
              />
              <button onClick={handleRefreshMatch} style={actionBtnStyle}>
                Refresh Match Data
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={scoreMatchId}
                onChange={e => setScoreMatchId(e.target.value)}
                placeholder="Match ID"
                style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #1E2D1E', borderRadius: 8, color: '#E8F5E8', fontSize: 13 }}
              />
              <button onClick={handleRerunScoring} style={actionBtnStyle}>
                Re-run Scoring
              </button>
            </div>
            <button onClick={handleRecalcLeaderboard} style={{ ...actionBtnStyle, alignSelf: 'flex-start' }}>
              Recalculate Leaderboard
            </button>
          </div>
        </div>
      )}

      {/* Matches */}
      {tab === 'matches' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E2D1E' }}>
                <th style={thStyle}>Match ID</th>
                <th style={thStyle}>Predictions</th>
                <th style={thStyle}>Locked</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map(m => (
                <tr key={m.match_id} style={{ borderBottom: '1px solid rgba(30,45,30,0.5)' }}>
                  <td style={tdStyle}>{m.match_id}</td>
                  <td style={tdStyle}>{m.prediction_count}</td>
                  <td style={tdStyle}>{m.locked_count}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleLockMatch(m.match_id)} style={smallBtnStyle}>Lock</button>
                      <button onClick={() => handleUnlockMatch(m.match_id)} style={smallBtnStyle}>Unlock</button>
                    </div>
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr><td colSpan={4} style={{ ...tdStyle, color: '#5A7A5A' }}>No matches with predictions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E2D1E' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>IQ Points</th>
                <th style={thStyle}>Rank</th>
                <th style={thStyle}>Admin</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(30,45,30,0.5)' }}>
                  <td style={tdStyle}>{u.id}</td>
                  <td style={tdStyle}>{u.username}</td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>{u.football_iq_points}</td>
                  <td style={tdStyle}>{u.rank_title}</td>
                  <td style={tdStyle}>{u.is_admin ? 'Yes' : 'No'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleToggleAdmin(u.id, u.username)} style={smallBtnStyle}>
                      {u.is_admin ? 'Revoke' : 'Grant'} Admin
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action log */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#5A7A5A' }}>Action Log</h2>
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid #1E2D1E',
          borderRadius: 8,
          padding: 12,
          maxHeight: 200,
          overflowY: 'auto',
          fontFamily: 'var(--font-jetbrains)',
          fontSize: 11,
          lineHeight: 1.6,
        }}>
          {actionLog.length === 0 && <span style={{ color: '#5A7A5A' }}>No actions yet</span>}
          {actionLog.map((entry, i) => (
            <div key={i} style={{ color: entry.includes('failed') || entry.includes('Failed') ? '#ff6b6b' : '#00FF85' }}>
              {entry}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: 'rgba(0,255,133,0.1)',
  border: '1px solid #00FF85',
  borderRadius: 8,
  color: '#00FF85',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const smallBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid #1E2D1E',
  borderRadius: 6,
  color: '#E8F5E8',
  cursor: 'pointer',
  fontSize: 11,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  color: '#5A7A5A',
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
};
