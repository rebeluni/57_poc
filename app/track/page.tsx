'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  Clock,
  User,
  ShieldAlert,
  ArrowRight,
  FileCheck,
  AlertCircle,
  HelpCircle,
  Calendar,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Ticket, TicketEvent } from '@/lib/types';
import { PRIORITY_CONFIG } from '@/lib/config';

function TrackContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id') || '';
  const initialEmail = searchParams.get('email') || '';

  const [ticketId, setTicketId] = useState(initialId);
  const [email, setEmail] = useState(initialEmail);
  const [ticket, setTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTicket = async (idToSearch: string, emailToSearch?: string) => {
    if (!idToSearch.trim()) return;
    if (!emailToSearch || !emailToSearch.trim()) {
      setTicket(null);
      setErrorMessage('Please enter both your Ticket ID and your employee email to securely access your request.');
      setSearched(true);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setSearched(true);

    try {
      const res = await fetch(
        `/api/track?id=${encodeURIComponent(idToSearch.trim())}&email=${encodeURIComponent(
          emailToSearch.trim()
        )}`
      );
      const data = await res.json();

      if (!res.ok || !data.ticket) {
        setTicket(null);
        setErrorMessage(
          data.error ||
            `No request found with ID "${idToSearch}" for email "${emailToSearch}". Please verify both values.`
        );
        return;
      }

      setTicket(data.ticket);
    } catch (err) {
      setErrorMessage('Failed to connect to the People Desk server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      fetchTicket(initialId, initialEmail);
    }
  }, [initialId, initialEmail]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTicket(ticketId, email);
  };

  // Helper for status timeline steps
  const getTimelineState = (step: 'open' | 'active' | 'finalized') => {
    if (!ticket) return 'upcoming';
    if (step === 'open') return 'completed';
    if (step === 'active') {
      if (ticket.status === 'active' || ticket.status === 'finalized') return 'completed';
      return 'upcoming';
    }
    if (step === 'finalized') {
      return ticket.status === 'finalized' ? 'completed' : 'upcoming';
    }
    return 'upcoming';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium tracking-wide uppercase mb-3">
          <Search className="w-3.5 h-3.5 text-sky-500" />
          <span>Solves Problem 1: Request Visibility</span>
        </div>
        <h1 className="font-serif-luxury text-3xl sm:text-4xl text-slate-900 tracking-tight font-medium">
          Track Your Request Status
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-xl font-light">
          Real-time visibility into your request timeline, assigned owner, SLA countdown, and resolution notes.
        </p>

        {/* Quick Demo Pre-fill Links */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Try existing tickets:</span>
          <button
            onClick={() => {
              setTicketId('REQ-2026-0001');
              setEmail('ananya.sharma@physique57.in');
              fetchTicket('REQ-2026-0001', 'ananya.sharma@physique57.in');
            }}
            className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-sky-400 hover:text-sky-600 transition-colors shadow-2xs font-mono"
          >
            REQ-2026-0001 (P1 Breached)
          </button>
          <button
            onClick={() => {
              setTicketId('REQ-2026-0004');
              setEmail('rohan.mehta@physique57.in');
              fetchTicket('REQ-2026-0004', 'rohan.mehta@physique57.in');
            }}
            className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-sky-400 hover:text-sky-600 transition-colors shadow-2xs font-mono"
          >
            REQ-2026-0004 (Active)
          </button>
          <button
            onClick={() => {
              setTicketId('REQ-2026-0007');
              setEmail('tara.alvares@physique57.in');
              fetchTicket('REQ-2026-0007', 'tara.alvares@physique57.in');
            }}
            className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-sky-400 hover:text-sky-600 transition-colors shadow-2xs font-mono"
          >
            REQ-2026-0007 (Finalized)
          </button>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Ticket Number
            </label>
            <input
              type="text"
              required
              placeholder="e.g. REQ-2026-0001"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email <span className="text-slate-400 font-normal">(Optional validation)</span>
            </label>
            <input
              type="email"
              placeholder="ananya.sharma@physique57.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <span>Locating...</span>
              ) : (
                <>
                  <Search className="w-4 h-4 text-sky-400" />
                  <span>Find Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>

        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Ticket Details Display */}
      {ticket && (
        <div className="space-y-6 animate-in fade-in-50">
          {/* Main Status Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                    {ticket.ticket_number}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {ticket.category}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      ticket.priority === 'P1'
                        ? 'bg-red-100 text-red-800'
                        : ticket.priority === 'P2'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {ticket.priority}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Ingested via {ticket.channel}
                  </span>
                </div>
                <h2 className="font-serif-luxury text-xl sm:text-2xl font-semibold text-slate-900 mt-2">
                  {ticket.subject}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Submitted by {ticket.requester_name} ({ticket.requester_email}) on{' '}
                  {new Date(ticket.created_at).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex flex-col items-start sm:items-end">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Current Lifecycle
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    ticket.status === 'finalized'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : ticket.status === 'active'
                      ? 'bg-sky-100 text-sky-800 border border-sky-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  {ticket.status}
                </span>
              </div>
            </div>

            {/* Three-Stage Visual Timeline: Open -> Active -> Finalized */}
            <div className="py-8">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-6">
                Lifecycle Progression
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                {/* Step 1: Open */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    getTimelineState('open') === 'completed'
                      ? 'bg-white border-slate-300 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Step 1 · Open
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Request Ingested</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Auto-categorised & queued. Response clock running.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-3 font-mono">
                    {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Step 2: Active */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    getTimelineState('active') === 'completed'
                      ? 'bg-white border-sky-300 ring-2 ring-sky-50 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                      Step 2 · Active
                    </span>
                    {ticket.status === 'active' || ticket.status === 'finalized' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-900">In Investigation</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {ticket.assignee_name
                      ? `Owned by ${ticket.assignee_name}`
                      : ticket.assignee
                      ? `Owned by ${ticket.assignee.name}`
                      : 'Awaiting team assignee'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-3 font-mono">
                    {ticket.first_response_at
                      ? `First responded: ${new Date(ticket.first_response_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Pending first response'}
                  </p>
                </div>

                {/* Step 3: Finalized */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    getTimelineState('finalized') === 'completed'
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Step 3 · Finalized
                    </span>
                    {ticket.status === 'finalized' ? (
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Resolved</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {ticket.status === 'finalized'
                      ? 'Resolution note logged & verified.'
                      : 'Pending full resolution.'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-3 font-mono">
                    {ticket.resolved_at
                      ? `Finalized: ${new Date(ticket.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Expected by SLA window'}
                  </p>
                </div>
              </div>
            </div>

            {/* Resolution Note Callout if finalized */}
            {ticket.status === 'finalized' && ticket.resolution_note && (
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 mb-6">
                <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs uppercase tracking-wider mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Resolution Note from Support Team</span>
                </div>
                <p className="text-sm text-emerald-950 leading-relaxed font-medium">
                  {ticket.resolution_note}
                </p>
                <p className="text-[11px] text-emerald-700 mt-2">
                  Finalized on {ticket.resolved_at && new Date(ticket.resolved_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                </p>
              </div>
            )}

            {/* SLA Status Bar */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-600" /> SLA Target Countdown
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    ticket.sla_state === 'Breached'
                      ? 'bg-red-100 text-red-700'
                      : ticket.sla_state === 'Breaching Soon'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {ticket.sla_state} ({ticket.time_remaining_str})
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    ticket.sla_state === 'Breached'
                      ? 'bg-red-500'
                      : ticket.sla_state === 'Breaching Soon'
                      ? 'bg-amber-500'
                      : 'bg-sky-500'
                  }`}
                  style={{ width: `${Math.min(100, ticket.sla_elapsed_percent || 0)}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2">
                <span>Start: {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>
                  Resolution Target:{' '}
                  {new Date(ticket.resolve_due_at).toLocaleString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  IST
                </span>
              </div>
            </div>

            {/* Description Body */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Original Request Text
              </h4>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                {ticket.description}
              </p>
            </div>
          </div>

          {/* Verified Access Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Verified Employee Access
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              This request timeline is authenticated for <span className="font-semibold text-slate-700">{email}</span>. Internal team triage notes and coordinator routing remain confidential to the operations queue. For inquiries regarding this ticket, reference ID <span className="font-mono font-semibold text-slate-800">{ticket.ticket_number}</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-10 text-center text-xs text-slate-400">Loading tracking portal...</div>}>
      <TrackContent />
    </Suspense>
  );
}
