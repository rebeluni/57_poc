'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Layers,
  ArrowRight,
  ShieldCheck,
  Lock,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

const COLORS = ['#0EA5E9', '#6366F1', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6'];

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check auth
  useEffect(() => {
    fetch('/api/auth/passcode')
      .then((res) => res.json())
      .then((data) => setIsAuthenticated(data.isAuthenticated))
      .catch(() => setIsAuthenticated(false));
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      console.error('Failed to load metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMetrics();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) throw new Error('Incorrect passcode');
      setIsAuthenticated(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError('Authentication failed');
      }
    }
  };

  if (isAuthenticated === false) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
          <div className="w-12 h-12 rounded-full bg-slate-900 text-sky-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-serif-luxury text-2xl font-semibold text-center text-slate-900">
            Metrics Dashboard Protected
          </h2>
          <p className="text-xs text-slate-500 text-center mt-1.5 font-light">
            Enter the admin passcode to view real-time SLA metrics and operational charts.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <input
              type="password"
              required
              autoFocus
              placeholder="Enter administrator passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
            {authError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{authError}</p>}
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors"
            >
              Access Dashboard
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Access is protected via the <span className="font-mono font-semibold text-slate-700">ADMIN_PASSCODE</span> environment variable.
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-semibold uppercase tracking-wider">
              <LayoutDashboard className="w-3.5 h-3.5 text-sky-400" /> Operational Intelligence
            </span>
            <span className="text-xs text-slate-400">· Solves Problem 4: Data Inconsistency</span>
          </div>
          <h1 className="font-serif-luxury text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">
            People Desk Performance Metrics
          </h1>
        </div>

        <button
          onClick={fetchMetrics}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {loading && !metrics ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading metrics...</div>
      ) : metrics ? (
        <div className="mt-8 space-y-8 animate-in fade-in-50">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Open */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Open Tickets</span>
              <p className="font-serif-luxury text-2xl font-bold text-slate-900 mt-1">{metrics.kpis.open}</p>
              <span className="text-[10px] text-amber-600 font-medium">Pending triage/pickup</span>
            </div>

            {/* Active */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Active In Progress</span>
              <p className="font-serif-luxury text-2xl font-bold text-sky-600 mt-1">{metrics.kpis.active}</p>
              <span className="text-[10px] text-slate-400">Assigned & working</span>
            </div>

            {/* SLA Breaches */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">SLA Breaches</span>
              <p className="font-serif-luxury text-2xl font-bold text-red-600 mt-1">{metrics.kpis.breached}</p>
              <span className="text-[10px] text-red-500 font-medium">Escalated to leads</span>
            </div>

            {/* % Resolved within SLA */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">SLA Compliance</span>
              <p className="font-serif-luxury text-2xl font-bold text-emerald-600 mt-1">
                {metrics.kpis.slaCompliancePercent}%
              </p>
              <span className="text-[10px] text-emerald-600 font-medium">Resolved within SLA</span>
            </div>

            {/* Avg First Response */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Avg First Response</span>
              <p className="font-serif-luxury text-2xl font-bold text-slate-900 mt-1">
                {metrics.kpis.avgResponseHours}h
              </p>
              <span className="text-[10px] text-slate-400">Target &le;4h</span>
            </div>

            {/* Avg Resolution Time */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Avg Resolution</span>
              <p className="font-serif-luxury text-2xl font-bold text-slate-900 mt-1">
                {metrics.kpis.avgResolveHours}h
              </p>
              <span className="text-[10px] text-slate-400">Business hours</span>
            </div>
          </div>

          {/* Needs Attention Warning Section */}
          {metrics.needsAttention && metrics.needsAttention.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs uppercase font-bold tracking-wider">
                    Needs Immediate Attention ({metrics.needsAttention.length} Tickets Breaching or Breached)
                  </span>
                </div>
                <Link
                  href="/admin"
                  className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1"
                >
                  <span>Open Admin Queue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {metrics.needsAttention.slice(0, 3).map((item: any) => (
                  <Link
                    key={item.id}
                    href="/admin"
                    className="p-3.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs hover:shadow-xs transition-shadow block"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">{item.ticket_number}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.sla_state === 'Breached'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.sla_state}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800 mt-1.5 truncate">{item.subject}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                      <span>Owner: {item.assignee?.name || 'Unassigned'}</span>
                      <span className="font-semibold text-red-600">{item.time_remaining_str}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Charts Row 1: Volume Trend & Department Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 14-Day Volume Trend */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-4">
                14-Day Request & Resolution Volume Trend
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.volumeTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        color: '#FFF',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="submitted"
                      name="Submitted"
                      stroke="#0EA5E9"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="resolved"
                      name="Resolved"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Ticket Distribution */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-4">
                Active Tickets & Breaches by Department
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.byDepartment}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        color: '#FFF',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="open" name="Open/Active" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="breached" name="Breached" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2: Channel Intake & Priority Distribution & SLA Compliance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* By Channel */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                Intake Volume by Channel
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.byChannel}
                      dataKey="count"
                      nameKey="channel"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {metrics.byChannel.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        color: '#FFF',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-[10px] text-slate-600 mt-2">
                {metrics.byChannel.map((ch: any, i: number) => (
                  <span key={ch.channel} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                    <span>{ch.channel}: {ch.count}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* By Priority */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                Volume by Priority Matrix
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.byPriority}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="priority" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        color: '#FFF',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="count" name="Tickets" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                P1 Critical automatically routes & alerts team leads
              </p>
            </div>

            {/* SLA Compliance by Department */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                Department SLA Compliance %
              </h3>
              <div className="space-y-4 pt-2">
                {metrics.complianceByDept.map((item: any) => (
                  <div key={item.department}>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>{item.department}</span>
                      <span className="font-semibold text-slate-900">{item.compliancePercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.compliancePercent >= 90
                            ? 'bg-emerald-500'
                            : item.compliancePercent >= 75
                            ? 'bg-sky-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${item.compliancePercent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
