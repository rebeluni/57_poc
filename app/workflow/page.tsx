'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  GitBranch,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Maximize2,
  FileCode,
  Sparkles,
  Server,
} from 'lucide-react';

const MAIN_WORKFLOW_MERMAID = `flowchart TD
    %% -------------------------------------------------------------
    %% STAGE 1: INTAKE & NORMALISATION
    %% -------------------------------------------------------------
    subgraph INTAKE ["1. OMNI-CHANNEL INTAKE & NORMALISATION"]
        C1["WhatsApp Business API"] --> ADAPTER["OmniChannel Ingestion Adapter<br/>(/api/intake)"]
        C2["Email (Gmail/Outlook)"] --> ADAPTER
        C3["Web Intake Form"] --> ADAPTER
        C4["SMS Gateway (Twilio)"] --> ADAPTER
        C5["Instagram DM (Meta Webhook)"] --> ADAPTER
        C6["Intercom / Live Chat"] --> ADAPTER

        ADAPTER --> NORM["Normalise to Standard Schema<br/>(Sender, Channel, Text, Timestamp)"]
        NORM --> EMP_LOOKUP{"Employee Lookup<br/>(Mock HRIS/CRM)"}
        EMP_LOOKUP -- "Matched" --> DUP_CHECK{"Duplicate Check<br/>(Same Email + Cat &le;24h)"}
        EMP_LOOKUP -- "Unmatched" --> FLAG_UNVERIFIED["Flag as Unverified Employee"] --> DUP_CHECK
        DUP_CHECK -- "Token Match &ge;35%" --> LINK_DUP["Link as possible_duplicate_of<br/>(Alert agent; do not block)"] --> GEN_ID["Generate REQ-2026-XXXX ID"]
        DUP_CHECK -- "Unique" --> GEN_ID
        GEN_ID --> ACK["Dispatch Acknowledgement<br/>(Email / Ingest Channel)"]
    end

    %% -------------------------------------------------------------
    %% STAGE 2: CATEGORISATION & TRIAGE
    %% -------------------------------------------------------------
    subgraph CATEGORISATION ["2. CATEGORISATION ENGINE"]
        GEN_ID --> RULE_ENGINE["Rule Engine: Weighted Keyword Scoring<br/>(Payroll, HR, IT, Operations)"]
        RULE_ENGINE --> CONF_CHECK{"Confidence &ge; 0.60?"}
        CONF_CHECK -- "Yes" --> ASSIGN_CAT["Assign Top Category"]
        CONF_CHECK -- "No (Ambiguous)" --> AI_FALLBACK{"AI Classifier Enabled?<br/>(GEMINI_API_KEY flag)"}
        AI_FALLBACK -- "Key present" --> GEMINI["Gemini 1.5 Flash Fallback<br/>(Strict JSON schema)"]
        AI_FALLBACK -- "No key / Error" --> TRIAGE_Q["Route to Triage Queue<br/>(Category = Other)"]
        GEMINI --> GEMINI_CONF{"AI Confidence &ge; 0.60?"}
        GEMINI_CONF -- "Yes" --> ASSIGN_AI_CAT["Assign AI-suggested Category"]
        GEMINI_CONF -- "No" --> TRIAGE_Q
    end

    %% -------------------------------------------------------------
    %% STAGE 3: PRIORITY MATRIX & SLA DATES
    %% -------------------------------------------------------------
    subgraph PRIORITY_SLA ["3. PRIORITY MATRIX & SLA TARGETS"]
        ASSIGN_CAT --> PRIORITY_MATRIX{"Priority Matrix<br/>(Keywords + Urgent Checkbox)"}
        ASSIGN_AI_CAT --> PRIORITY_MATRIX
        TRIAGE_Q --> PRIORITY_MATRIX

        PRIORITY_MATRIX -- "Salary, outage, breach, hazard" --> P1["P1 Critical<br/>Resp: 1h | Resolve: 4h"]
        PRIORITY_MATRIX -- "Urgent flag OR POS/Wi-Fi down" --> P2["P2 High<br/>Resp: 4h | Resolve: 1 Bus Day"]
        PRIORITY_MATRIX -- "Standard leaves, reimbursements" --> P3["P3 Normal<br/>Resp: 1 Bus Day | Resolve: 3 Bus Days"]
        PRIORITY_MATRIX -- "Parking, general inquiries" --> P4["P4 Low<br/>Resp: 2 Bus Days | Resolve: 5 Bus Days"]

        P1 --> CALC_SLA["SLA Calendar Engine<br/>(IST: 9am-7pm Mon-Sat; skips Sunday)"]
        P2 --> CALC_SLA
        P3 --> CALC_SLA
        P4 --> CALC_SLA
        CALC_SLA --> SLA_STAMPS["Set response_due_at & resolve_due_at"]
    end

    %% -------------------------------------------------------------
    %% STAGE 4: SMART ROUTING & ASSIGNMENT
    %% -------------------------------------------------------------
    subgraph ROUTING ["4. LOAD-BALANCED ROUTING"]
        SLA_STAMPS --> ROUTE_CHECK{"Category = Other?"}
        ROUTE_CHECK -- "Yes" --> UNASSIGNED["Leave Unassigned<br/>(Human Triage Queue)"]
        ROUTE_CHECK -- "No" --> DEPT_MEMBERS["Query Active Dept Team Members"]
        DEPT_MEMBERS --> OOO_CHECK{"All Out of Office?"}
        OOO_CHECK -- "Yes" --> ESC_LEAD["Fallback: Assign to Team Lead"]
        OOO_CHECK -- "No" --> LEAST_OPEN["Assign to Member with<br/>Least Open Tickets"]
    end

    %% -------------------------------------------------------------
    %% STAGE 5: STATE MACHINE & ESCALATION LADDER
    %% -------------------------------------------------------------
    subgraph LIFECYCLE ["5. STATE MACHINE & ESCALATION LADDER"]
        LEAST_OPEN --> STATE_OPEN["State: OPEN<br/>(Response SLA clock ticking)"]
        ESC_LEAD --> STATE_OPEN
        UNASSIGNED --> STATE_OPEN

        STATE_OPEN --> WATCHDOG{"SLA Watchdog Checks<br/>(Admin load & /api/cron/escalate)"}
        WATCHDOG -- "P1 Immediate OR 80% elapsed" --> L1["Escalation L1: Warning<br/>Notify Owner"]
        WATCHDOG -- "100% SLA elapsed (Breached)" --> L2["Escalation L2: SLA Breach<br/>Notify Team Lead"]
        WATCHDOG -- "150% SLA elapsed" --> L3["Escalation L3: Critical Breach<br/>Notify Department Head"]

        STATE_OPEN -- "Owner accepts ticket" --> STATE_ACTIVE["State: ACTIVE<br/>(Records first_response_at; Resolution SLA runs)"]
        STATE_ACTIVE -- "Issue resolved + mandatory note" --> STATE_FINAL["State: FINALIZED<br/>(Closes SLA clock; records resolved_at)"]

        STATE_FINAL -- "Requester dispute &le; 7 days" --> REOPEN["Reopen Ticket to ACTIVE<br/>(Mandatory justification)"] --> STATE_ACTIVE
        STATE_FINAL -- "&gt; 7 days in Finalized" --> ARCHIVED["Flag archived = true<br/>(Hidden from default queue; feeds metrics)"]
    end

    %% -------------------------------------------------------------
    %% AUDIT TRAIL ACROSS ALL NODES
    %% -------------------------------------------------------------
    subgraph AUDIT ["IMMUTABLE AUDIT LOG & REPORTING"]
        AUDIT_LOG[("ticket_events Table<br/>Logs Actor, Action, Timestamps, Notes")]
        STATE_OPEN -. "write event" .-> AUDIT_LOG
        STATE_ACTIVE -. "write event" .-> AUDIT_LOG
        STATE_FINAL -. "write event" .-> AUDIT_LOG
        L1 -. "write alert" .-> AUDIT_LOG
        L2 -. "write alert" .-> AUDIT_LOG
        ARCHIVED -. "aggregate" .-> DASHBOARD["Executive Metrics Dashboard (/dashboard)"]
    end

    classDef intake fill:#F0F9FF,stroke:#0284C7,stroke-width:2px;
    classDef rule fill:#EEF2FF,stroke:#6366F1,stroke-width:2px;
    classDef priority fill:#FEF3C7,stroke:#D97706,stroke-width:2px;
    classDef state fill:#ECFDF5,stroke:#059669,stroke-width:2px;
    classDef breach fill:#FEE2E2,stroke:#DC2626,stroke-width:2px;

    class INTAKE,ADAPTER,NORM,ACK intake;
    class RULE_ENGINE,CONF_CHECK,GEMINI rule;
    class PRIORITY_MATRIX,CALC_SLA priority;
    class STATE_OPEN,STATE_ACTIVE,STATE_FINAL state;
    class L1,L2,L3 breach;`;

const ARCH_MERMAID = `flowchart LR
    subgraph CHANNELS ["External Ingestion Sources"]
        W["WhatsApp Cloud API"]
        G["Gmail / Outlook Webhooks"]
        I["Instagram Graph API"]
        T["Twilio SMS Webhooks"]
        C["Intercom App Webhook"]
        F["Physique 57 Web Portal"]
    end

    subgraph INGESTION ["Vercel Edge & Serverless Runtime"]
        API["POST /api/intake<br/>Zod Validation & IP Rate Limiting"]
        RULES["Deterministic Rules Engine<br/>/lib/config.ts"]
        SLA["IST Business Hours Calculator<br/>9am-7pm Mon-Sat"]
        ROUTER["Least-Open-Tickets Router<br/>+ OOO Fallback"]
        AI["Optional Gemini 1.5 Flash<br/>(GEMINI_API_KEY)"]
    end

    subgraph STORAGE ["Supabase Postgres Cloud (Free Tier)"]
        DB[("Postgres Database<br/>tickets, ticket_events, employees, notifications")]
    end

    subgraph CONSUMERS ["Consuming Clients & Alerting"]
        ADMIN["Admin Console (/admin)<br/>State Machine & Queues"]
        DASH["Metrics Dashboard (/dashboard)<br/>Recharts Analytics"]
        TRACK["Public Tracking (/track)<br/>Employee Self-Service"]
        ALERTS["Simulated Alerts Tray<br/>In-App / Slack Webhook Mock"]
    end

    CHANNELS --> API
    API --> RULES
    RULES -- "Low confidence < 0.6" --> AI
    RULES --> SLA --> ROUTER --> DB
    DB --> ADMIN
    DB --> DASH
    DB --> TRACK
    DB --> ALERTS

    classDef tech fill:#F8FAFC,stroke:#0F172A,stroke-width:2px;
    class CHANNELS,INGESTION,STORAGE,CONSUMERS tech;`;

export default function WorkflowPage() {
  const mainDiagramRef = useRef<HTMLDivElement>(null);
  const archDiagramRef = useRef<HTMLDivElement>(null);

  const [mainCopied, setMainCopied] = useState(false);
  const [archCopied, setArchCopied] = useState(false);
  const [showMainSource, setShowMainSource] = useState(false);
  const [showArchSource, setShowArchSource] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function renderMermaid() {
      try {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          flowchart: {
            curve: 'basis',
            useMaxWidth: true,
            htmlLabels: true,
          },
        });

        if (mainDiagramRef.current && mounted) {
          const { svg } = await mermaid.render('mermaid-main-diagram', MAIN_WORKFLOW_MERMAID);
          mainDiagramRef.current.innerHTML = svg;
        }

        if (archDiagramRef.current && mounted) {
          const { svg } = await mermaid.render('mermaid-arch-diagram', ARCH_MERMAID);
          archDiagramRef.current.innerHTML = svg;
        }
      } catch (err: unknown) {
        if (mounted) {
          if (err instanceof Error) {
            setRenderError(err.message);
          } else {
            setRenderError('Error rendering Mermaid diagram');
          }
        }
      }
    }

    renderMermaid();
    return () => {
      mounted = false;
    };
  }, []);

  const downloadSvg = (containerRef: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!containerRef.current) return;
    const svgEl = containerRef.current.querySelector('svg');
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPng = (containerRef: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!containerRef.current) return;
    const svgEl = containerRef.current.querySelector('svg');
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const svgSize = svgEl.getBoundingClientRect();

    // Scale up for high-res output
    const scale = 2;
    canvas.width = svgSize.width * scale;
    canvas.height = svgSize.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium tracking-wide uppercase mb-3">
          <GitBranch className="w-3.5 h-3.5 text-sky-500" />
          <span>Operational Architecture & Logic Flow</span>
        </div>
        <h1 className="font-serif-luxury text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          End-to-End System Workflow
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-3xl font-light">
          Complete decision tree governing Omni-Channel Ingestion, Rule-Based Triage, Priority Matrix, Business Hours SLA calculation, Least-Open-Tickets Routing, Escalation Ladders, and State Transitions.
        </p>
      </div>

      {renderError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          Diagram rendering notice: {renderError}
        </div>
      )}

      {/* Diagram 1: End-to-End Operational Lifecycle Workflow */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-sky-600 block">
              Core Operational Logic
            </span>
            <h2 className="font-serif-luxury text-xl font-semibold text-slate-900 mt-0.5">
              1. Request Triage, Escalation & State Lifecycle
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadSvg(mainDiagramRef, 'physique57-people-desk-workflow.svg')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download SVG</span>
            </button>
            <button
              onClick={() => downloadPng(mainDiagramRef, 'physique57-people-desk-workflow.png')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download PNG</span>
            </button>
            <button
              onClick={() => copyToClipboard(MAIN_WORKFLOW_MERMAID, setMainCopied)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-2xs"
            >
              {mainCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{mainCopied ? 'Copied' : 'Copy Source (Draw.io ready)'}</span>
            </button>
          </div>
        </div>

        {/* Diagram SVG Container */}
        <div className="my-6 p-4 rounded-xl bg-slate-50/50 border border-slate-100 overflow-x-auto min-h-[500px] flex items-center justify-center">
          {renderError ? (
            <div className="w-full space-y-2 p-2">
              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                Mermaid render fallback: showing diagram source code below.
              </p>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto max-h-[460px] leading-relaxed text-left">
                {MAIN_WORKFLOW_MERMAID}
              </pre>
            </div>
          ) : (
            <div ref={mainDiagramRef} className="w-full text-center" />
          )}
        </div>

        {/* Collapsible Source Code */}
        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={() => setShowMainSource(!showMainSource)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <span className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span>Mermaid Source Code (Paste into draw.io or Mermaid Live Editor)</span>
            </span>
            {showMainSource ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showMainSource && (
            <div className="mt-3 relative">
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
                {MAIN_WORKFLOW_MERMAID}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Diagram 2: Production Real-World Integration Architecture */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
              Production Architecture Specification
            </span>
            <h2 className="font-serif-luxury text-xl font-semibold text-slate-900 mt-0.5">
              2. Production Integration Architecture (Simulated in this Prototype)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadSvg(archDiagramRef, 'physique57-production-architecture.svg')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download SVG</span>
            </button>
            <button
              onClick={() => copyToClipboard(ARCH_MERMAID, setArchCopied)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-2xs"
            >
              {archCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{archCopied ? 'Copied' : 'Copy Mermaid'}</span>
            </button>
          </div>
        </div>

        {/* Diagram SVG Container */}
        <div className="my-6 p-4 rounded-xl bg-slate-50/50 border border-slate-100 overflow-x-auto min-h-[300px] flex items-center justify-center">
          {renderError ? (
            <div className="w-full space-y-2 p-2">
              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                Mermaid render fallback: showing diagram source code below.
              </p>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto max-h-[360px] leading-relaxed text-left">
                {ARCH_MERMAID}
              </pre>
            </div>
          ) : (
            <div ref={archDiagramRef} className="w-full text-center" />
          )}
        </div>

        {/* Collapsible Source Code */}
        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={() => setShowArchSource(!showArchSource)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <span className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span>Mermaid Architecture Source</span>
            </span>
            {showArchSource ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showArchSource && (
            <div className="mt-3 relative">
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto max-h-72 leading-relaxed">
                {ARCH_MERMAID}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
