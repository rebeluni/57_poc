'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Send,
  Sparkles,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import {
  PREFILL_EXAMPLES,
  SUPPORTED_CHANNELS,
  TicketChannel,
  PRIORITY_CONFIG,
  CATEGORY_CONFIG,
  FormExample,
} from '@/lib/config';
import { Ticket } from '@/lib/types';

interface IntakeSubmissionResponse {
  ticket: Ticket;
  analysis: {
    category: string;
    confidence: number;
    matchedKeywords: string[];
    source: string;
    reason: string;
    priority: string;
    assignedTo: string;
    routingReason: string;
    possibleDuplicateOf?: string | null;
    responseDueAt: string;
    resolveDueAt: string;
  };
}

export default function SubmitRequestPage() {
  const [channel, setChannel] = useState<TicketChannel>('Web Form');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderEmployeeId, setSenderEmployeeId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [urgent, setUrgent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<IntakeSubmissionResponse | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handlePrefill = (example: FormExample) => {
    setSenderName(example.name);
    setSenderEmail(example.email);
    setSenderEmployeeId(example.employeeId);
    setChannel(example.channel);
    setSubject(example.subject);
    setBody(example.description);
    setUrgent(example.urgent);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          sender_name: senderName,
          sender_email: senderEmail,
          sender_employee_id: senderEmployeeId || null,
          subject,
          body,
          urgent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setSubmissionResult(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTicketNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const resetForm = () => {
    setSubmissionResult(null);
    setSubject('');
    setBody('');
    setUrgent(false);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Editorial Header */}
      <div className="mb-10 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-800 text-xs font-medium tracking-wide uppercase mb-3">
          <Sparkles className="w-3.5 h-3.5 text-sky-500" />
          <span>Omni-Channel Request Intake</span>
        </div>
        <h1 className="font-serif-luxury text-3xl sm:text-4xl text-slate-900 tracking-tight font-medium">
          How can the People Desk support you today?
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-500 max-w-2xl font-light">
          Submit HR leaves, IT help, payroll inquiries, or studio facility issues. Every request is automatically triaged, assigned SLA targets, and routed directly to team owners.
        </p>

        {/* 4 Pillars Operational Callouts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6 text-left">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Problem 1: Visibility</p>
            <p className="text-xs font-medium text-slate-800 mt-0.5">Centralized ticket tracking</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Problem 2: Accountability</p>
            <p className="text-xs font-medium text-slate-800 mt-0.5">Assigned owner & SLA clock</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Problem 3: Slow Responses</p>
            <p className="text-xs font-medium text-slate-800 mt-0.5">Instant auto-categorisation</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Problem 4: Inconsistency</p>
            <p className="text-xs font-medium text-slate-800 mt-0.5">Unified data & audit trail</p>
          </div>
        </div>
      </div>

      {/* Confirmation Card when submitted */}
      {submissionResult ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 animate-in fade-in-50">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-400/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Request Ingested & Triaged
                </span>
                <h2 className="font-serif-luxury text-2xl sm:text-3xl font-semibold mt-2 text-white">
                  Ticket #{submissionResult.ticket.ticket_number}
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Recorded in People Desk system · Acknowledgement dispatched to {submissionResult.ticket.requester_email}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyTicketNumber(submissionResult.ticket.ticket_number)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all backdrop-blur-sm border border-white/10"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedId ? 'Copied!' : 'Copy Ticket ID'}
                </button>
                <Link
                  href={`/track?id=${submissionResult.ticket.ticket_number}&email=${encodeURIComponent(submissionResult.ticket.requester_email)}`}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold transition-all shadow-xs"
                >
                  <span>Track Ticket</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Triaged Intelligence Breakdown */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Duplicate Notice Banner if detected */}
            {submissionResult.analysis.possibleDuplicateOf && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">Potential Duplicate Linked:</span> We noticed you submitted a similar inquiry recently (
                  <Link
                    href={`/track?id=${submissionResult.analysis.possibleDuplicateOf}`}
                    className="underline font-semibold hover:text-amber-950"
                  >
                    {submissionResult.analysis.possibleDuplicateOf}
                  </Link>
                  ). Both tickets have been cross-referenced to avoid redundant work.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Detected Category</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-serif-luxury font-semibold text-lg text-slate-900">
                    {submissionResult.analysis.category}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                    {Math.round(submissionResult.analysis.confidence * 100)}% Match
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {submissionResult.analysis.matchedKeywords.length > 0 ? (
                    submissionResult.analysis.matchedKeywords.map((kw, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700">
                        #{kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400">None matched</span>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Assigned Priority</span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      submissionResult.analysis.priority === 'P1'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : submissionResult.analysis.priority === 'P2'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : submissionResult.analysis.priority === 'P3'
                        ? 'bg-sky-100 text-sky-800 border border-sky-200'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {submissionResult.analysis.priority} · {PRIORITY_CONFIG[submissionResult.analysis.priority as keyof typeof PRIORITY_CONFIG]?.name.split('·')[1]?.trim() || 'Standard'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
                  {PRIORITY_CONFIG[submissionResult.analysis.priority as keyof typeof PRIORITY_CONFIG]?.criteria}
                </p>
              </div>

              {/* Assigned Owner */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Assigned Owner</span>
                <div className="flex items-center gap-2 mt-1">
                  <UserCheck className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-semibold text-slate-900 text-sm truncate">
                    {submissionResult.analysis.assignedTo}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 line-clamp-2">
                  {submissionResult.analysis.routingReason}
                </p>
              </div>

              {/* Channel Lineage */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Ingestion Channel</span>
                <div className="flex items-center gap-1.5 mt-1 font-semibold text-slate-800 text-sm">
                  <Layers className="w-4 h-4 text-slate-500" />
                  <span>{submissionResult.ticket.channel}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Unified omnichannel schema
                </p>
              </div>
            </div>

            {/* SLA Timeline Commitments */}
            <div className="p-5 rounded-xl border border-slate-200 bg-white">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-600" /> SLA Commitments (IST 9am - 7pm Mon - Sat)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                  <span className="text-slate-400">First Response Target</span>
                  <p className="font-semibold text-slate-800 text-sm mt-0.5">
                    {new Date(submissionResult.analysis.responseDueAt).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })} IST
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                  <span className="text-slate-400">Full Resolution Target</span>
                  <p className="font-semibold text-slate-800 text-sm mt-0.5">
                    {new Date(submissionResult.analysis.resolveDueAt).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })} IST
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={resetForm}
                className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Submit another request
              </button>
              <Link
                href={`/track?id=${submissionResult.ticket.ticket_number}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <span>View Live Status Timeline</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Form Section */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {/* Quick Pre-fill Dropdown */}
          <div className="mb-8 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                Evaluation Demo: Try a realistic pre-filled example
              </span>
              <p className="text-[11px] text-slate-500">
                Populate realistic inputs to test HR, IT, Payroll, and Operations triage rules.
              </p>
            </div>

            <div className="relative">
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  const found = PREFILL_EXAMPLES.find((ex) => ex.title === val);
                  if (found) handlePrefill(found);
                }}
                defaultValue=""
                className="w-full sm:w-64 appearance-none px-3 py-2 pr-8 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="" disabled>
                  Select a test scenario...
                </option>
                {PREFILL_EXAMPLES.map((ex, idx) => (
                  <option key={idx} value={ex.title}>
                    {ex.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Sharma"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Employee Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ananya.sharma@physique57.in"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Employee ID (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Employee ID <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. P57-EMP-014"
                  value={senderEmployeeId}
                  onChange={(e) => setSenderEmployeeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Channel Dropdown (Simulating Omni-Channel) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Intake Channel</span>
                  <span className="text-[10px] text-sky-600 font-normal">Omni-Channel Simulation</span>
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as TicketChannel)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                >
                  {SUPPORTED_CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Subject / Short Summary <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Briefly state what you need assistance with..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Description Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Include relevant specifics (dates, equipment, error messages, studio location)..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Urgent Flag Checkbox */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <input
                type="checkbox"
                id="urgent-checkbox"
                checked={urgent}
                onChange={(e) => setUrgent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <label htmlFor="urgent-checkbox" className="text-xs text-slate-700 cursor-pointer">
                <span className="font-semibold text-slate-900 block">I think this is urgent</span>
                <span className="text-slate-500 text-[11px] block mt-0.5">
                  Flags this request for expedited review in the priority matrix. P1 tickets immediately notify team leads.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <span>Triage engine processing...</span>
                ) : (
                  <>
                    <span>Submit to People Desk</span>
                    <Send className="w-4 h-4 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-slate-400 mt-3">
                Protected by Physique 57 internal SLA guarantees. Sequential ID generated on submission.
              </p>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
