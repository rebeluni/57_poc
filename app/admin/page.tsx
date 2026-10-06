'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Search,
  Filter,
  ArrowUpDown,
  UserCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Bell,
  RefreshCw,
  Layers,
  ChevronRight,
  X,
  Lock,
  LogOut,
  Send,
  MessageSquare,
  AlertOctagon,
  Sparkles,
  Archive,
} from 'lucide-react';
import {
  DepartmentCategory,
  TicketPriority,
  TicketStatus,
  EscalationLevel,
  TicketChannel,
  CATEGORY_CONFIG,
  PRIORITY_CONFIG,
  SUPPORTED_CHANNELS,
} from '@/lib/config';
import { Ticket, TicketEvent, TeamMember, NotificationItem } from '@/lib/types';

export default function AdminConsolePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Queue state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [slaStateFilter, setSlaStateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Sort by SLA due time

  // Drawer & Modals state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketEvents, setTicketEvents] = useState<TicketEvent[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Action dialogs in drawer
  const [actionDialog, setActionDialog] = useState<
    'none' | 'activate' | 'finalize' | 'reopen' | 'reassign' | 'override' | 'add_note'
  >('none');
  const [resolutionNote, setResolutionNote] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [overrideCategory, setOverrideCategory] = useState<DepartmentCategory>('HR');
  const [overridePriority, setOverridePriority] = useState<TicketPriority>('P3');
  const [overrideReason, setOverrideReason] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Notifications slide-over
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // 1. Check Passcode Authentication
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/passcode', { cache: 'no-store' });
        const data = await res.json();
        setIsAuthenticated(data.isAuthenticated);
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  // 2. Fetch Tickets & Data
  const loadTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (channelFilter !== 'all') params.set('channel', channelFilter);
      if (assigneeFilter !== 'all') params.set('assignee_id', assigneeFilter);
      if (slaStateFilter !== 'all') params.set('slaState', slaStateFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (includeArchived) params.set('includeArchived', 'true');

      const res = await fetch(`/api/tickets?${params.toString()}`);
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadTickets();
    }
  }, [
    isAuthenticated,
    statusFilter,
    categoryFilter,
    priorityFilter,
    channelFilter,
    assigneeFilter,
    slaStateFilter,
    searchQuery,
    includeArchived,
  ]);

  // Load Team Members
  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/tickets?status=all')
        .then((res) => res.json())
        .then(async () => {
          // Fetch members from /api/tickets/seed or first ticket detail
          const detailRes = await fetch('/api/tickets/33333333-3333-3333-3333-333333330001');
          if (detailRes.ok) {
            const d = await detailRes.json();
            if (d.teamMembers) setTeamMembers(d.teamMembers);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        throw new Error('Invalid administrator passcode');
      }
      setIsAuthenticated(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError('Authentication failed');
      }
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await fetch('/api/auth/passcode', { method: 'DELETE' });
    setIsAuthenticated(false);
  };

  // Open Ticket Detail Drawer
  const openTicketDrawer = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDrawerLoading(true);
    setActionError(null);
    setActionDialog('none');
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        setTicketEvents(data.events || []);
        if (data.teamMembers) setTeamMembers(data.teamMembers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Execute Ticket Action (State change, reassign, override, note)
  const handleExecuteAction = async () => {
    if (!selectedTicket) return;
    setActionSubmitting(true);
    setActionError(null);

    try {
      let body: Record<string, unknown> = {};

      if (actionDialog === 'activate') {
        body = {
          action: 'status_transition',
          newStatus: 'active',
          assigneeId: newAssigneeId || selectedTicket.assignee_id,
          note: 'Started active investigation and initial contact.',
        };
      } else if (actionDialog === 'finalize') {
        body = {
          action: 'status_transition',
          newStatus: 'finalized',
          note: resolutionNote,
        };
      } else if (actionDialog === 'reopen') {
        body = {
          action: 'status_transition',
          newStatus: 'active',
          note: reopenReason,
        };
      } else if (actionDialog === 'reassign') {
        body = {
          action: 'reassign',
          newAssigneeId,
        };
      } else if (actionDialog === 'override') {
        body = {
          action: 'override',
          category: overrideCategory,
          priority: overridePriority,
          reason: overrideReason,
        };
      } else if (actionDialog === 'add_note') {
        body = {
          action: 'add_note',
          note: internalNote,
        };
      }

      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Action execution failed');
      }

      // Update state
      if (data.ticket) setSelectedTicket(data.ticket);
      if (data.events) setTicketEvents(data.events);
      setActionDialog('none');
      setResolutionNote('');
      setReopenReason('');
      setOverrideReason('');
      setInternalNote('');
      loadTickets(); // Refresh background queue
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('Action execution failed');
      }
    } finally {
      setActionSubmitting(false);
    }
  };

  // Simulate incoming omnichannel message
  const handleSimulateMessage = async () => {
    setSimulating(true);
    try {
      const res = await fetch('/api/simulate', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.ticket) {
        await loadTickets();
        openTicketDrawer(data.ticket);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  // Sort tickets by SLA due time
  const sortedTickets = [...tickets].sort((a, b) => {
    const timeA = new Date(a.resolve_due_at).getTime();
    const timeB = new Date(b.resolve_due_at).getTime();
    return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
  });

  // Passcode Gate Modal
  if (isAuthenticated === false) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
          <div className="w-12 h-12 rounded-full bg-slate-900 text-sky-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-serif-luxury text-2xl font-semibold text-center text-slate-900">
            Admin Console Access
          </h2>
          <p className="text-xs text-slate-500 text-center mt-1.5 font-light">
            Enter the shared management passcode to access live queues, dispatch controls, and SLA escalations.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Passcode
              </label>
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter administrator passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs transition-colors"
            >
              Unlock People Desk Console
            </button>

            <p className="text-[11px] text-center text-slate-400">
              Access is protected via the <span className="font-mono font-semibold text-slate-700">ADMIN_PASSCODE</span> environment variable. Session is secured with an HMAC-signed httpOnly cookie.
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Admin Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Admin Console
            </span>
            <span className="text-xs text-slate-400">· Accountability & SLA Control</span>
          </div>
          <h1 className="font-serif-luxury text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">
            Request Dispatch & Triage Queue
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Simulate Incoming Message Button */}
          <button
            onClick={handleSimulateMessage}
            disabled={simulating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
            title="Generates a mock incoming message from WhatsApp, Instagram, SMS, or Email"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{simulating ? 'Ingesting message...' : 'Simulate Incoming Message'}</span>
          </button>

          {/* Refresh Queue */}
          <button
            onClick={loadTickets}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
            title="Refresh ticket queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="my-6 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ID, subject, or requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open (Unresolved)</option>
              <option value="active">Active (Investigating)</option>
              <option value="finalized">Finalized</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
            >
              <option value="all">All Departments</option>
              <option value="HR">HR</option>
              <option value="IT">IT</option>
              <option value="Payroll">Payroll</option>
              <option value="Operations">Operations</option>
              <option value="Other">Other / Triage</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
            >
              <option value="all">All Priorities</option>
              <option value="P1">P1 Critical</option>
              <option value="P2">P2 High</option>
              <option value="P3">P3 Normal</option>
              <option value="P4">P4 Low</option>
            </select>
          </div>

          {/* SLA State Filter */}
          <div>
            <select
              value={slaStateFilter}
              onChange={(e) => setSlaStateFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
            >
              <option value="all">All SLA States</option>
              <option value="On Track">On Track</option>
              <option value="Breaching Soon">Breaching Soon (≥80%)</option>
              <option value="Breached">Breached (100%+)</option>
              <option value="Met SLA">Met SLA</option>
              <option value="Resolved Late">Resolved Late</option>
            </select>
          </div>
        </div>

        {/* Secondary filters row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Channel filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Channel:</span>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 text-xs bg-white text-slate-700"
              >
                <option value="all">All Channels</option>
                {SUPPORTED_CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            {/* Owner filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Owner:</span>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 text-xs bg-white text-slate-700"
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned (Triage)</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Include Archived toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>Include archived tickets (&gt;7 days finalized)</span>
            </label>
          </div>

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-900 font-medium"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>SLA Due Time ({sortOrder === 'asc' ? 'Earliest First' : 'Latest First'})</span>
          </button>
        </div>
      </div>

      {/* Tickets Queue Table & Mobile Stacked Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop / Tablet Table View (>= 768px) with sticky right Action column */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">SLA State</th>
                <th className="py-3 px-4 text-right sticky right-0 bg-slate-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading queue records...
                  </td>
                </tr>
              ) : sortedTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No tickets match the selected filters.
                  </td>
                </tr>
              ) : (
                sortedTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => openTicketDrawer(t)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    {/* ID + Channel */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      <div>{t.ticket_number}</div>
                      <div className="text-[10px] font-sans font-normal text-slate-400 flex items-center gap-1 mt-0.5">
                        <Layers className="w-2.5 h-2.5" /> {t.channel}
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                      <div className="font-medium text-slate-900 truncate">{t.subject}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {t.requester_name} ({t.requester_email})
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                        {t.category}
                      </span>
                      {t.category_source === 'ai' && (
                        <span className="ml-1 text-[9px] text-purple-600 bg-purple-50 px-1 rounded">AI</span>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          t.priority === 'P1'
                            ? 'bg-red-100 text-red-800'
                            : t.priority === 'P2'
                            ? 'bg-amber-100 text-amber-800'
                            : t.priority === 'P3'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                          t.status === 'finalized'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.status === 'active'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {t.status}
                      </span>
                      {t.archived && (
                        <span className="ml-1 text-[10px] text-slate-400 flex items-center gap-0.5">
                          <Archive className="w-2.5 h-2.5" /> Archived
                        </span>
                      )}
                    </td>

                    {/* Assignee */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                      {t.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-medium">Unassigned (Triage)</span>
                      )}
                    </td>

                    {/* SLA State & Escalation badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            t.sla_state === 'Breached'
                              ? 'bg-red-100 text-red-800'
                              : t.sla_state === 'Breaching Soon' || t.sla_state === 'Resolved Late'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {t.sla_state}
                        </span>
                        {/* Escalation Level Badge L0/L1/L2/L3 */}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            t.escalation_level === 'L3'
                              ? 'bg-red-600 text-white'
                              : t.escalation_level === 'L2'
                              ? 'bg-red-500 text-white'
                              : t.escalation_level === 'L1'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t.escalation_level}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {t.time_remaining_str}
                      </div>
                    </td>

                    {/* Sticky Action Arrow */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Loading queue records...
            </div>
          ) : sortedTickets.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No tickets match the selected filters.
            </div>
          ) : (
            sortedTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => openTicketDrawer(t)}
                className="p-4 space-y-2.5 hover:bg-slate-50/80 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-900">
                    <span>{t.ticket_number}</span>
                    <span className="text-[10px] font-sans font-normal text-slate-400">· {t.channel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        t.priority === 'P1'
                          ? 'bg-red-100 text-red-800'
                          : t.priority === 'P2'
                          ? 'bg-amber-100 text-amber-800'
                          : t.priority === 'P3'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.priority}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        t.status === 'finalized'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : t.status === 'active'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {t.status}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-900 line-clamp-2">{t.subject}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t.requester_name} · <span className="text-slate-600 font-medium">{t.category}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        t.sla_state === 'Breached'
                          ? 'bg-red-100 text-red-800'
                          : t.sla_state === 'Breaching Soon' || t.sla_state === 'Resolved Late'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {t.sla_state}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {t.time_remaining_str}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openTicketDrawer(t);
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Open</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ticket Detail Drawer (Slide-over) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {selectedTicket.ticket_number}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                      selectedTicket.status === 'finalized'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedTicket.status === 'active'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedTicket.status}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                    Escalation: {selectedTicket.escalation_level}
                  </span>
                </div>
                <h3 className="font-serif-luxury text-lg font-semibold text-slate-900 mt-1">
                  {selectedTicket.subject}
                </h3>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Action Error Banner */}
              {actionError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* State Machine Transition Actions */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                  State Machine Operations
                </span>

                <div className="flex flex-wrap gap-2">
                  {/* Open -> Active */}
                  {selectedTicket.status === 'open' && (
                    <button
                      onClick={() => setActionDialog('activate')}
                      className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-2xs"
                    >
                      Accept & Move to Active (Records Response)
                    </button>
                  )}

                  {/* Active -> Finalized */}
                  {selectedTicket.status === 'active' && (
                    <button
                      onClick={() => setActionDialog('finalize')}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-2xs"
                    >
                      Resolve & Finalize Ticket
                    </button>
                  )}

                  {/* Reopen within 7 days */}
                  {selectedTicket.status === 'finalized' && !selectedTicket.archived && (
                    <button
                      onClick={() => setActionDialog('reopen')}
                      className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs"
                    >
                      Reopen Ticket (Allowed &lt;7 days)
                    </button>
                  )}

                  {/* If Archived */}
                  {selectedTicket.archived && (
                    <span className="text-xs text-slate-400 italic">
                      Archived ticket (&gt;7 days finalized). Cannot be reopened.
                    </span>
                  )}

                  {/* Reassign dropdown button */}
                  <button
                    onClick={() => {
                      setNewAssigneeId(selectedTicket.assignee_id || '');
                      setActionDialog('reassign');
                    }}
                    className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-medium transition-colors"
                  >
                    Reassign Owner
                  </button>

                  {/* Override Category / Priority */}
                  <button
                    onClick={() => {
                      setOverrideCategory(selectedTicket.category);
                      setOverridePriority(selectedTicket.priority);
                      setActionDialog('override');
                    }}
                    className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-medium transition-colors"
                  >
                    Manual Override
                  </button>

                  {/* Add Note */}
                  <button
                    onClick={() => setActionDialog('add_note')}
                    className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-medium transition-colors"
                  >
                    + Internal Note
                  </button>
                </div>

                {/* Sub-Dialog: Activate Confirm */}
                {actionDialog === 'activate' && (
                  <div className="mt-3 p-4 rounded-xl bg-white border border-sky-200 space-y-3">
                    <p className="text-xs text-slate-700 font-medium">
                      Moving to <span className="font-semibold text-sky-700">Active</span> records the first-response time stamp and commits to the resolution SLA.
                    </p>
                    {!selectedTicket.assignee_id && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Select Owner (Required):
                        </label>
                        <select
                          value={newAssigneeId}
                          onChange={(e) => setNewAssigneeId(e.target.value)}
                          className="w-full text-xs p-2 rounded border border-slate-300"
                        >
                          <option value="">Select an agent...</option>
                          {teamMembers
                            .filter((m) => m.department === selectedTicket.category)
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} {m.is_team_lead ? '(Lead)' : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setActionDialog('none')}
                        className="px-3 py-1.5 rounded text-xs text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleExecuteAction}
                        disabled={actionSubmitting}
                        className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
                      >
                        Confirm Active Transition
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-Dialog: Finalize with Resolution Note */}
                {actionDialog === 'finalize' && (
                  <div className="mt-3 p-4 rounded-xl bg-white border border-emerald-200 space-y-3">
                    <label className="block text-xs font-semibold text-slate-800">
                      Resolution Note <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Explain how this inquiry or issue was resolved (e.g. reimbursed via payroll, Wi-Fi router reset, leave approved in HRMS)..."
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setActionDialog('none')}
                        className="px-3 py-1.5 rounded text-xs text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleExecuteAction}
                        disabled={actionSubmitting || resolutionNote.trim().length < 5}
                        className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Finalize & Close SLA Clock
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-Dialog: Reopen */}
                {actionDialog === 'reopen' && (
                  <div className="mt-3 p-4 rounded-xl bg-white border border-slate-300 space-y-3">
                    <label className="block text-xs font-semibold text-slate-800">
                      Reopening Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Why is this finalized ticket being reopened?"
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setActionDialog('none')}
                        className="px-3 py-1.5 rounded text-xs text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleExecuteAction}
                        disabled={actionSubmitting || reopenReason.trim().length < 5}
                        className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Reopen to Active
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-Dialog: Reassign */}
                {actionDialog === 'reassign' && (
                  <div className="mt-3 p-4 rounded-xl bg-white border border-slate-300 space-y-3">
                    <label className="block text-xs font-semibold text-slate-800">
                      Select New Assignee
                    </label>
                    <select
                      value={newAssigneeId}
                      onChange={(e) => setNewAssigneeId(e.target.value)}
                      className="w-full text-xs p-2 rounded border border-slate-300"
                    >
                      <option value="">Unassigned (Triage)</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.department} - {m.is_team_lead ? 'Lead' : 'Member'})
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setActionDialog('none')}
                        className="px-3 py-1.5 rounded text-xs text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleExecuteAction}
                        disabled={actionSubmitting}
                        className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold"
                      >
                        Update Assignee
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-Dialog: Manual Override */}
                {actionDialog === 'override' && (
                  <div className="mt-3 p-4 rounded-xl bg-white border border-slate-300 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Category Override
                        </label>
                        <select
                          value={overrideCategory}
                          onChange={(e) => setOverrideCategory(e.target.value as DepartmentCategory)}
                          className="w-full text-xs p-2 rounded border border-slate-300"
                        >
                          <option value="HR">HR</option>
                          <option value="IT">IT</option>
                          <option value="Payroll">Payroll</option>
                          <option value="Operations">Operations</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Priority Override
                        </label>
                        <select
                          value={overridePriority}
                          onChange={(e) => setOverridePriority(e.target.value as TicketPriority)}
                          className="w-full text-xs p-2 rounded border border-slate-300"
                        >
                          <option value="P1">P1 Critical</option>
                          <option value="P2">P2 High</option>
                          <option value="P3">P3 Normal</option>
                          <option value="P4">P4 Low</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Override Justification Reason <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Why is the rule-engine classification being modified?"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        className="w-full text-xs p-2 rounded border border-slate-300"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setActionDialog('none')}
                        className="px-3 py-1.5 rounded text-xs text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleExecuteAction}
                        disabled={actionSubmitting || overrideReason.trim().length < 3}
                        className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Save Override & Log Audit
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-Dialog: Add Note */}
                {actionDialog === 'add_note' && (
                  <div className="mt-3 p-4 rounded-xl bg-white border border-slate-300 space-y-3">
                    <label className="block text-xs font-semibold text-slate-800">
                      Add Internal Investigation Note
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Add internal notes visible to staff on this ticket..."
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setActionDialog('none')}
                        className="px-3 py-1.5 rounded text-xs text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleExecuteAction}
                        disabled={actionSubmitting || internalNote.trim().length < 2}
                        className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Categorisation & AI Reasoning */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-2">
                  Triaging Engine Reasoning
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Source:</span>
                    <span className="ml-1.5 font-semibold text-slate-800 capitalize">
                      {selectedTicket.category_source} Engine
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Confidence:</span>
                    <span className="ml-1.5 font-semibold text-slate-800">
                      {Math.round(selectedTicket.category_confidence * 100)}%
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-xs">
                  <span className="text-slate-400">Matched Keywords:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTicket.matched_keywords && selectedTicket.matched_keywords.length > 0 ? (
                      selectedTicket.matched_keywords.map((kw, i) => (
                        <span key={`${kw}-${i}`} className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px]">
                          #{kw}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">None</span>
                    )}
                  </div>
                </div>

                {selectedTicket.possible_duplicate_of && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <span className="font-semibold">Linked Duplicate:</span> Similar request detected (
                    <span className="font-mono font-bold">{selectedTicket.possible_duplicate_of}</span>).
                  </div>
                )}
              </div>

              {/* Request Description */}
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                  Request Text
                </span>
                <p className="p-3.5 rounded-xl bg-slate-50 text-slate-800 text-xs leading-relaxed whitespace-pre-wrap border border-slate-200">
                  {selectedTicket.description}
                </p>
              </div>

              {/* SLA Target Breakdown */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                  SLA Target Clock
                </span>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Response Due:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(selectedTicket.response_due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                      ({selectedTicket.first_response_at ? 'Responded' : 'Pending'})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Resolution Due:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(selectedTicket.resolve_due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audit Log / Event Trail */}
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-3">
                  Audit Trail & History
                </span>
                <div className="space-y-3">
                  {ticketEvents.map((ev, i) => (
                    <div key={ev.id || `event-${i}`} className="text-xs border-l-2 border-slate-200 pl-3 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{ev.actor}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {ev.action}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {ev.note && <p className="text-slate-600 mt-1">{ev.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
