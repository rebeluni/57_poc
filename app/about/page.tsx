import React from 'react';
import {
  FileText,
  Clock,
  ShieldAlert,
  Layers,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  CATEGORY_CONFIG,
  PRIORITY_CONFIG,
  SLA_CONFIG,
  ESCALATION_THRESHOLDS,
  OPERATIONAL_ASSUMPTIONS,
  BUSINESS_HOURS,
  DepartmentCategory,
  TicketPriority,
} from '@/lib/config';

export const metadata = {
  title: 'Design Notes & Operational Rules | Physique 57 People Desk',
  description:
    'Single source of truth: Keyword categorisation rules, priority matrix, IST business hours SLA calculations, and escalation thresholds.',
};

export default function AboutPage() {
  const categories = Object.keys(CATEGORY_CONFIG) as DepartmentCategory[];
  const priorities = Object.keys(PRIORITY_CONFIG) as TicketPriority[];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium tracking-wide uppercase mb-3">
          <BookOpen className="w-3.5 h-3.5 text-sky-500" />
          <span>Documentation Integrity Guarantee</span>
        </div>
        <h1 className="font-serif-luxury text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          System Rules & Operational Design Notes
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-3xl font-light">
          This page is dynamically bound to <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">/lib/config.ts</code>—the exact same typed configuration powering the triage engine, business hours SLA clocks, and routing logic. Documentation never drifts from running code.
        </p>
      </div>

      {/* 1. Category Keyword Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-sky-600" />
          <h2 className="font-serif-luxury text-xl font-semibold text-slate-900">
            1. Departmental Categorisation Rules
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-6 font-light">
          Incoming inquiries undergo deterministic weighted keyword matching. If the top scoring category achieves a confidence score &ge; 0.60, it is accepted immediately. Ambiguous queries trigger the optional AI fallback (or human triage).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Scope Description</th>
                <th className="py-2.5 px-3">Target Role</th>
                <th className="py-2.5 px-3">Keywords & Weights</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((cat) => {
                const def = CATEGORY_CONFIG[cat];
                return (
                  <tr key={cat} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${def.badgeColor}`}>
                        {def.displayName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs">{def.description}</td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{def.defaultOwnerRole}</td>
                    <td className="py-3 px-3">
                      {def.keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {def.keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono"
                              title={`Weight: ${kw.weight}`}
                            >
                              {kw.keyword} <span className="text-slate-400">({kw.weight}x)</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Fallback queue (no keywords)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Priority Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <h2 className="font-serif-luxury text-xl font-semibold text-slate-900">
            2. Priority Matrix & Impact Triggers
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-6 font-light">
          Priority is dynamically derived from detected department keywords combined with the optional employee &quot;I think this is urgent&quot; flag.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {priorities.map((pri) => {
            const def = PRIORITY_CONFIG[pri];
            return (
              <div key={pri} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      def.level === 'P1'
                        ? 'bg-red-100 text-red-800'
                        : def.level === 'P2'
                        ? 'bg-amber-100 text-amber-800'
                        : def.level === 'P3'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {def.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Level {def.level}</span>
                </div>
                <p className="text-xs text-slate-800 font-medium">{def.description}</p>
                <div className="pt-1 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-600">Triggers:</span> {def.criteria}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SLA Service Level Table & Business Hours */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h2 className="font-serif-luxury text-xl font-semibold text-slate-900">
              3. SLA Commitments & IST Business Calendar
            </h2>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
            Operating: 9:00 AM – 7:00 PM IST (Mon–Sat)
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-6 font-light">
          SLA deadlines exclude non-business hours and Sundays. For example, a P1 ticket arriving at 6:30 PM on Saturday requires a 1-hour response, rolling the remaining 30 minutes forward to Monday 9:30 AM IST.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Response SLA Window</th>
                <th className="py-2.5 px-3">Resolution SLA Window</th>
                <th className="py-2.5 px-3">Business Hours Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {priorities.map((pri) => {
                const sla = SLA_CONFIG[pri];
                return (
                  <tr key={pri} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-semibold text-slate-900 font-mono">{pri}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{sla.responseLabel}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{sla.resolveLabel}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {sla.responseHours}h first contact / {sla.resolveHours}h resolution ({BUSINESS_HOURS.hoursPerDay}h/day cap)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Escalation Ladder */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          <h2 className="font-serif-luxury text-xl font-semibold text-slate-900">
            4. Escalation Ladder & Automated Triggers
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-6 font-light">
          Evaluated in real time whenever an admin opens the queue and via the Vercel Cron-compatible route (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">/api/cron/escalate</code>).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ESCALATION_THRESHOLDS.map((esc) => (
            <div
              key={esc.level}
              className={`p-4 rounded-xl border ${
                esc.level === 'L3'
                  ? 'bg-red-50/60 border-red-200 text-red-950'
                  : esc.level === 'L2'
                  ? 'bg-red-50/40 border-red-200 text-red-900'
                  : esc.level === 'L1'
                  ? 'bg-amber-50/50 border-amber-200 text-amber-900'
                  : 'bg-slate-50/50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-sm">{esc.level}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-current">
                  &ge;{esc.percentage}% SLA
                </span>
              </div>
              <p className="text-xs font-semibold">{esc.label}</p>
              <p className="text-[11px] text-slate-600 mt-1">{esc.action}</p>
              <p className="text-[10px] font-mono text-slate-400 mt-2">Target: {esc.targetRole}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Core Operational Assumptions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-sky-600" />
          <h2 className="font-serif-luxury text-xl font-semibold text-slate-900">
            5. Design Assumptions & Operational Philosophy
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OPERATIONAL_ASSUMPTIONS.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80">
              <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" />
                <span>{item.title}</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-light">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
