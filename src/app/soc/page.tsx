'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield, Activity, AlertTriangle, Eye, Download, RefreshCw, Search,
  X, Globe, Monitor, TrendingUp, Zap, CheckCircle, AlertCircle, BarChart2, Terminal, Trash2
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

interface LogEntry {
  id: string; timestamp: string; ip: string; country: string; city: string;
  method: string; url: string; status_code: number; response_time_ms: number;
  user_agent: string; role: string; api_name: string; risk_score: number;
  severity: string; detected_threats: string; is_flagged: boolean; is_bot: boolean;
}

interface Alert {
  id: string; rule_name: string; severity: string; risk_score: number;
  description: string; why_flagged: string; potential_impact: string;
  investigation_steps: string[]; mitigations: string[]; owasp_category: string;
  ip: string; country: string; created_at: string; is_resolved: boolean; is_false_positive: boolean;
}

interface Stats {
  summary: { totalRequests: number; flaggedRequests: number; totalAlerts: number; unresolvedAlerts: number; requests404: number; loginSuccess: number; loginFailed: number };
  charts: {
    severityDistribution: Array<{ severity: string; count: string }>;
    requestsPerHour: Array<{ hour: string; count: string; flagged_count: string }>;
    statusCodeDistribution: Array<{ status_code: number; count: string }>;
    attackTypes: Array<{ rule_name: string; count: string }>;
    topCountries: Array<{ country: string; count: string; flagged_count: string }>;
  };
  topIPs: Array<{ ip: string; country: string; total_requests: string; flagged_requests: string; max_risk_score: number }>;
}

const getSeverityClass = (s: string) => {
  switch (s) {
    case 'Critical': return 'soc-critical';
    case 'High': return 'soc-high';
    case 'Medium': return 'soc-medium';
    case 'Low': return 'soc-low';
    default: return 'soc-none';
  }
};
const getStatusColor = (code: number) => {
  if (code < 300) return 'text-green-400';
  if (code < 400) return 'text-blue-400';
  if (code < 500) return 'text-yellow-400';
  return 'text-red-400';
};
const formatTimestamp = (ts: string) => new Date(ts).toLocaleString('en-IN');

export default function SOCDashboard() {
  const [tab, setTab] = useState<'overview' | 'logs' | 'alerts' | 'live' | 'rules'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);

  const [logFilters, setLogFilters] = useState({
    search: '', ip: '', severity: 'all', method: '', isFlagged: false, page: 1,
  });

  const liveRef = useRef<HTMLDivElement>(null);
  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/soc/stats', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {}
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: logFilters.page.toString(), limit: '100',
        ...(logFilters.search && { search: logFilters.search }),
        ...(logFilters.ip && { ip: logFilters.ip }),
        ...(logFilters.severity !== 'all' && { severity: logFilters.severity }),
        ...(logFilters.isFlagged && { isFlagged: 'true' }),
      });
      const res = await fetch(`/api/soc/logs?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) { setLogs(data.data.logs || []); setTotalLogs(data.data.pagination?.total || 0); }
    } catch {} finally { setLoading(false); }
  }, [logFilters]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/soc/alerts?limit=100', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setAlerts(data.data.alerts || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (tab !== 'live') return;
    const ws = new WebSocket(`ws://${window.location.hostname}:3000/ws/soc`);
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'NEW_LOG') {
        setLiveLogs(prev => [msg.payload, ...prev].slice(0, 500));
        if (liveRef.current) liveRef.current.scrollTop = 0;
      }
    };
    return () => ws.close();
  }, [tab]);

  useEffect(() => { fetchStats(); const t = setInterval(fetchStats, 30000); return () => clearInterval(t); }, [fetchStats]);
  useEffect(() => { if (tab === 'logs') fetchLogs(); }, [tab, fetchLogs]);
  useEffect(() => { if (tab === 'alerts') fetchAlerts(); }, [tab, fetchAlerts]);

  const resolveAlert = async (id: string, isFalsePositive = false) => {
    await fetch(`/api/soc/alerts/${id}/resolve`, {
      method: 'PATCH', headers: getAuthHeaders(),
      body: JSON.stringify({ isFalsePositive, notes: 'Resolved by analyst' }),
    });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_resolved: true } : a));
    if (selectedAlert?.id === id) setSelectedAlert(null);
  };

  const handleDownloadCSV = () => {
    window.open('/api/soc/logs/export?format=csv', '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 glass-dark border-r border-white/5 flex flex-col min-h-screen">
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div>
            <span className="font-black text-white">Secure<span className="text-brand-red">Mart</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="live-dot" />
            <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">SOC Live Feed</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart2 },
            { id: 'live', label: 'Live Terminal', icon: Activity, badge: liveLogs.length ? String(liveLogs.length) : undefined },
            { id: 'logs', label: 'Log Search', icon: Search },
            { id: 'alerts', label: 'Alert Center', icon: AlertTriangle },
            { id: 'rules', label: 'Detection Rules', icon: Shield },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id as any)} className={`sidebar-item w-full text-left ${tab === item.id ? 'active' : ''}`}>
              <item.icon className="w-5 h-5" /><span className="flex-1">{item.label}</span>
              {item.badge && <span className="bg-brand-red text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white capitalize">{tab === 'live' ? 'Live SOC Terminal' : tab}</h1>
            <p className="text-xs text-gray-500 mt-0.5">Real-time Request Threat Engine & Geolocation</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleDownloadCSV} className="btn-secondary text-sm px-4 py-2 border-green-500/30 text-green-400 hover:bg-green-500/10 gap-2">
              <Download className="w-4 h-4" /> Download CSV Logs
            </button>
            <button onClick={() => { fetchStats(); fetchLogs(); }} className="btn-ghost text-sm gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
          </div>
        </header>

        {/* OVERVIEW */}
        {tab === 'overview' && stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Requests', value: stats.summary.totalRequests, icon: Activity, color: 'text-blue-400' },
                { label: 'Flagged Threats', value: stats.summary.flaggedRequests, icon: AlertTriangle, color: 'text-red-400' },
                { label: 'Unresolved Alerts', value: stats.summary.unresolvedAlerts, icon: AlertCircle, color: 'text-orange-400' },
                { label: 'Failed Logins', value: stats.summary.loginFailed, icon: X, color: 'text-yellow-400' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 uppercase">{s.label}</span>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div className="stat-value">{s.value.toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Requests per Hour (24h)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats.charts.requestsPerHour}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="hour" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e8e8f0' }} />
                    <Area type="monotone" dataKey="count" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="flagged_count" stroke="#e94560" fill="#e94560" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Attack Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.charts.attackTypes.slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="rule_name" tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e8e8f0' }} />
                    <Bar dataKey="count" fill="#e94560" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* LIVE TERMINAL */}
        {tab === 'live' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{wsConnected ? '🟢 WebSocket Connected' : '🔴 Disconnected'}</span>
              <div className="flex items-center gap-2">
                <button onClick={handleDownloadCSV} className="btn-secondary text-xs px-3 py-1 border-green-500/30 text-green-400 hover:bg-green-500/10 gap-1">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={() => setLiveLogs([])} className="btn-ghost text-xs text-red-400 gap-1"><Trash2 className="w-3.5 h-3.5" /> Clear</button>
              </div>
            </div>
            <div ref={liveRef} className="soc-terminal h-[calc(100vh-220px)] overflow-auto p-4 space-y-1">
              {liveLogs.length === 0 ? (
                <div className="text-center py-24 text-gray-600">
                  <Terminal className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Waiting for incoming HTTP requests...</p>
                </div>
              ) : liveLogs.map(log => (
                <div key={log.id} className="soc-log-row">
                  <span className="text-xs text-gray-500 font-mono w-20">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="text-xs font-mono font-bold w-12 text-blue-400">{log.method}</span>
                  <span className={`text-xs font-mono font-bold w-8 ${getStatusColor(log.status_code)}`}>{log.status_code}</span>
                  <span className="text-xs font-mono text-cyan-400 w-28">{log.ip}</span>
                  <span className="text-xs text-gray-500 w-16">{log.country}</span>
                  <span className="text-xs text-gray-300 flex-1 truncate">{log.url}</span>
                  {log.is_flagged && <span className={getSeverityClass(log.severity)}>{log.severity}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOG SEARCH */}
        {tab === 'logs' && (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-4 flex gap-4">
              <input type="text" value={logFilters.search} onChange={e => setLogFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search URL, IP..." className="input text-sm flex-1" />
              <button onClick={fetchLogs} className="btn-primary text-sm px-4">Search</button>
              <button onClick={handleDownloadCSV} className="btn-secondary text-sm px-4 border-green-500/30 text-green-400 hover:bg-green-500/10 gap-2">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Timestamp</th><th>IP</th><th>Country</th><th>Method</th><th>URL</th><th>Status</th><th>Risk</th><th>Severity</th></tr></thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td className="text-xs font-mono text-gray-500">{formatTimestamp(l.timestamp)}</td>
                      <td className="font-mono text-cyan-400 text-xs">{l.ip}</td>
                      <td className="text-xs">{l.country}</td>
                      <td className="font-bold text-xs">{l.method}</td>
                      <td className="text-xs text-gray-400 font-mono max-w-48 truncate">{l.url}</td>
                      <td className={`text-xs font-bold ${getStatusColor(l.status_code)}`}>{l.status_code}</td>
                      <td className="text-xs font-bold">{l.risk_score}</td>
                      <td><span className={getSeverityClass(l.severity)}>{l.severity}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
