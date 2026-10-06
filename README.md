# Physique 57 · Employee Request Management System (ERMS)
### Modern Internal Helpdesk & Omnichannel Operations POC

A focused, high-polish Proof of Concept (POC) built for the recruitment assessment at **Physique 57**, a premier luxury barre fitness brand.

Evaluators care first and foremost about **design thinking, operational integrity, and business logic**. This system directly solves the operational friction that occurs when studio instructors, front desk staff, and corporate employees submit HR, IT, Payroll, and Studio Operations requests across fragmented channels (Email, WhatsApp, SMS, and direct messages).

---

## 🎯 The 4 Core Business Problems Solved

| Problem in Current Workflow | How This System Solves It | Technical / Operational Implementation |
| :--- | :--- | :--- |
| **1. Lack of Visibility** | Centralized intake & real-time employee self-service tracking. | Sequential human-readable IDs (`REQ-2026-XXXX`), public `/track` portal with 3-stage visual timeline (Open → Active → Finalized), and live status indicator. |
| **2. Accountability Gaps** | Strict ownership, business-hours SLAs, and automatic multi-tier escalations. | IST (Indian Standard Time) business hours engine (09:00–19:00 Mon–Sat), least-open-tickets load balancing, out-of-office fallback, and automated L0–L3 escalation watchdog. |
| **3. Slow Responses** | Instantaneous automated triaging and duplicate prevention. | Rule-first deterministic keyword scoring + Priority matrix (sub-millisecond latency, zero API costs) with optional Gemini 1.5 Flash fallback, plus 24h Jaccard duplicate detection. |
| **4. Data Inconsistency** | Immutable audit trails and executive decision-grade reporting. | Append-only `ticket_events` ledger for every state transition and reassignment, paired with an executive `/dashboard` displaying 14-day trends, SLA compliance rates, and backlog breakdown. |

---

## 🏗️ Architecture & Technology Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router, Server & Client Components, TypeScript)
- **Styling & Design System**: [Tailwind CSS v3](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), curated luxury fitness aesthetic (`#FAFAFA` off-white, `#0F172A` deep slate, `#0EA5E9` electric cyan accent, Playfair Display serif headings, Inter body typography).
- **Data & Storage**:
  - **Primary**: [Supabase PostgreSQL](https://supabase.com/) with full relational schema, RLS policies, custom sequence functions, and indexes.
  - **Zero-Config Fallback**: Built-in resilient in-memory repository pre-seeded with 14 realistic tickets, 12 employees, 11 team members, audit logs, and notifications. Runs out of the box with zero external setup needed.
- **Analytics & Visualizations**: [Recharts](https://recharts.org/) for executive dashboards.
- **Interactive Workflows**: [Mermaid.js](https://mermaid.js.org/) dynamic diagrams with instant SVG / PNG downloads.
- **AI Classification**: Google Gemini 1.5 Flash integration (purely optional fallback, enabled via `GEMINI_API_KEY`).
- **Authentication**: Single shared admin passcode (`ADMIN_PASSCODE=p57barre`) stored in a secure `httpOnly` cookie (`p57_admin_auth`). No complex signup screens for evaluators.

---

## ⚡ Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: v18.18.0 or newer (tested on Node v20/v22)
- **npm**: v9 or newer

### 2. Clone and Install
```bash
git clone <repo-url>
cd p57_poc
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
The application comes pre-configured with safe defaults:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_PASSCODE=p57barre

# Optional: Supabase configuration (app falls back to rich in-memory database if omitted)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Optional: Google Gemini AI fallback
# GEMINI_API_KEY=your-gemini-api-key
```

### 4. Optional: Supabase Database Setup
If connecting to Supabase:
1. Open your Supabase project's **SQL Editor**.
2. Run [`supabase/schema.sql`](file:///supabase/schema.sql) to create tables, sequences, indexes, and RLS policies.
3. Run [`supabase/seed.sql`](file:///supabase/seed.sql) to populate 14 realistic tickets, team members, and audit events.

### 5. Run the Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 6. Run Unit Tests
Validate the deterministic categorizer, priority triggers, and IST business-hours SLA engine:
```bash
npm test
```
All 10/10 test assertions will execute and pass via `tsx test/engine.test.ts`.

---

## 📱 Omnichannel Ingestion Webhook (`POST /api/intake`)

The system accepts requests from any external channel (Email, WhatsApp, Slack, SMS, Studio Webhook) through a unified endpoint.

### Sample `curl` Request (Simulating WhatsApp Ingestion)
```bash
curl -X POST http://localhost:3000/api/intake \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Missing overtime pay for weekend barre intensive",
    "description": "Hi team, I noticed my direct deposit pay slip for last week did not include the 6 overtime hours from the Saturday barre marathon at Bandra studio.",
    "employee_email": "priya.nair@physique57.com",
    "channel": "whatsapp",
    "is_urgent": false
  }'
```

### Sample Response:
```json
{
  "success": true,
  "ticket": {
    "ticket_id": "REQ-2026-0015",
    "subject": "Missing overtime pay for weekend barre intensive",
    "category": "Payroll",
    "priority": "P2",
    "status": "Open",
    "channel": "whatsapp",
    "assignee": {
      "name": "Kavita Shah",
      "email": "kavita.shah@physique57.com",
      "department": "Payroll"
    },
    "sla": {
      "response_due_at": "2026-10-06T13:00:00.000Z",
      "resolve_due_at": "2026-10-07T17:00:00.000Z",
      "escalation_level": "L0"
    },
    "categorisation": {
      "confidence": 0.92,
      "matched_keywords": ["overtime", "pay slip", "direct deposit"],
      "source": "rules"
    }
  }
}
```

---

## 🎬 3-Minute Evaluator Demo Script

Follow this step-by-step walkthrough to evaluate every dimension of the system:

### Step 1: Submit a Request (`/`)
1. Visit the home page: **`http://localhost:3000/`**.
2. Notice the **Live IST Business Hours** indicator in the navigation header (shows whether the Physique 57 Support Desk is currently open or outside operating hours).
3. Click one of the **1-Click Test Scenarios** (e.g., *"Priya Nair — Missing Overtime Pay"*).
4. Click **"Submit Request"**.
5. Observe the instant confirmation card:
   - Generated Ticket ID (e.g. `REQ-2026-0015`).
   - Categorised as **Payroll** with confidence score and matched keywords.
   - Assigned to **Kavita Shah** (Payroll Lead) via least-loaded routing.
   - SLA target deadlines calculated in IST business hours.

### Step 2: Track as an Employee (`/track`)
1. Click **"Track This Ticket"** or navigate to `/track`.
2. Inspect the **3-Stage Visual Timeline** (`Open` → `Active` → `Finalized`).
3. View the assigned department specialist, contact info, and response SLA countdown.

### Step 3: Admin Console & Ticket Lifecycle (`/admin`)
1. Navigate to **`/admin`**.
2. If prompted, enter the Admin Passcode: **`p57barre`** (stored in an httpOnly cookie).
3. Explore the filter bar:
   - Filter by Status (`Open`, `Active`, `Finalized`), Category (`HR`, `IT`, `Payroll`, `Operations`), Priority (`P1` to `P4`), or SLA State (`Breached`, `Breaching Soon`).
   - Toggle **"Include Archived"** to test the 7-day archival filter rule.
4. Click on any ticket row (or your newly created ticket) to open the **Detail Slide-over Drawer**.
5. Perform state machine actions:
   - Move from **Open** to **Active** (assignee acknowledges).
   - Enter an internal note (e.g. *"Reviewed studio attendance logs. Adjusted pay slip for next cycle."*).
   - Click **"Finalize Ticket"** (enters resolution notes).
6. Scroll down to inspect the **Immutable Audit History** showing every timestamped change and actor.

### Step 4: Executive Metrics & Backlog Health (`/dashboard`)
1. Navigate to **`/dashboard`**.
2. Review the 4 high-level KPI cards:
   - **Total Tickets** (with active vs finalized split).
   - **SLA Compliance Rate** (calculated against resolution deadlines).
   - **Avg Response Time** (in business hours).
   - **Active Backlog** & Urgent tickets.
3. Examine the interactive visualizations:
   - **14-Day Inflow vs. Resolution Trend** (Recharts dual-line chart).
   - **Category Distribution** (Bar chart showing HR, IT, Payroll, Operations).
   - **Channel Ingestion Breakdown** (Donut chart illustrating WhatsApp, Email, Slack, Web, SMS).
4. Review the **"Needs Attention"** table highlighting breached and P1 tickets with direct jump links to admin triage.

### Step 5: Visual Operational Workflow (`/workflow`)
1. Navigate to **`/workflow`**.
2. View the interactive **7-Stage Lifecycle Mermaid Diagram**:
   - `Ingestion` → `Deterministic Triaging` → `SLA Engine` → `Intelligent Routing` → `State Machine` → `Audit Logging` → `Analytics & Archival`.
3. Test the **"Download SVG"** or **"Download PNG"** buttons.
4. Expand the **"Draw.io & Raw Mermaid Source"** drawer to view or copy the diagram syntax.
5. Review the production-readiness architectural breakdown below the diagram (Webhooks, dead letter queues, and multi-tenant scaling).

### Step 6: Architecture & Operational Logic Notes (`/about`)
1. Navigate to **`/about`**.
2. Observe how all SLA threshold tables, keyword matrices, escalation tiers (L0–L3), and IST business hours rules are dynamically rendered directly from [`lib/config.ts`](file:///lib/config.ts) to guarantee zero documentation drift.

---

## 🧪 "Test in Incognito Mode" Checklist

To verify that the application has zero hidden session dependencies:
1. Open a new **Incognito / Private Window**.
2. Navigate to `http://localhost:3000/`.
3. Submit a ticket — verifies public intake works without login.
4. Navigate to `http://localhost:3000/track?id=REQ-2026-0001` — verifies public ticket lookup.
5. Navigate to `http://localhost:3000/admin` — verify the passcode modal appears. Enter `p57barre`.
6. Navigate to `http://localhost:3000/dashboard` and `http://localhost:3000/workflow` — verify all analytics and diagrams render immediately.

---

## 🔒 Security & Data Principles

- **No Public Passcode Exposure**: Passcode verification is handled via server-side API `/api/auth/passcode` setting `httpOnly`, `sameSite=lax` cookies.
- **Input Sanitization**: All incoming intake requests are strictly validated using [Zod](https://zod.dev/) schemas.
- **In-Memory Rate Limiting**: The intake API limits requests per client IP (30 requests/minute) to mitigate spam.
- **Safe Fallbacks**: Zero crashes if Supabase or Gemini credentials are missing; the system seamlessly operates on its pre-seeded mock memory store.

---

## 🚢 Deploying to Vercel (Free Tier)

1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Set Environment Variables in Project Settings:
   - `ADMIN_PASSCODE` = `p57barre`
   - `NEXT_PUBLIC_APP_URL` = `https://your-vercel-domain.vercel.app`
   - *(Optional)* `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy! Vercel automatically detects Next.js 15 and deploys to the global edge network.
5. *(Optional)* Set up a Vercel Cron in `vercel.json` to hit `/api/cron/escalate` every 15 minutes.

---

## 📄 License & Attribution

Built for the **Physique 57** Technical Recruitment Assessment.  
*All branding, colors, and typography styled to match the Physique 57 barre aesthetic.*
