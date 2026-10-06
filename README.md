# Physique 57 · Employee Request Management System (ERMS)
### Modern Internal Helpdesk & Omnichannel Operations POC

A focused, high-polish Proof of Concept (POC) built for the recruitment assessment at **Physique 57**, a premier luxury barre fitness brand.

Evaluators prioritize **systems design philosophy, operational logic, and the automated transformation of manual friction** over a sprawling finished product. This system directly solves the operational friction that occurs when studio instructors, front desk staff, and corporate employees submit HR, IT, Payroll, and Studio Operations requests across fragmented channels (Email, WhatsApp, SMS, and direct messages).

---

## 🎯 The 4 Core Business Problems Solved

| Problem in Current Workflow | How This System Solves It | Technical / Operational Implementation |
| :--- | :--- | :--- |
| **1. Lack of Visibility** | Centralized intake & real-time employee self-service tracking. | Sequential human-readable IDs (`REQ-2026-XXXX`), public `/track` portal with 3-stage visual timeline (Open → Active → Finalized), and live status indicator. |
| **2. Accountability Gaps** | Strict ownership, business-hours SLAs, and automatic multi-tier escalations. | IST (Indian Standard Time) business hours engine (09:00–19:00 Mon–Sat), least-open-tickets load balancing, out-of-office fallback, and automated L0–L3 escalation watchdog. |
| **3. Latent Response Times** | Instantaneous automated triaging and duplicate prevention. | Rule-first deterministic keyword scoring + Priority matrix (sub-millisecond latency, zero API costs) with optional Gemini 1.5 Flash fallback, plus 24h Jaccard duplicate detection. |
| **4. Data Inconsistency** | Immutable audit trails and executive decision-grade reporting. | Append-only `ticket_events` ledger for every state transition and reassignment, paired with an executive `/dashboard` displaying 14-day trends, SLA compliance rates, and backlog breakdown. |

---

## 🏗️ Architecture & Technology Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router, Server & Client Components, TypeScript)
- **Styling & Design System**: [Tailwind CSS v3](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), curated luxury fitness aesthetic (`#FAFAFA` off-white, `#0F172A` deep slate, `#0EA5E9` electric cyan accent, Playfair Display serif headings, Inter body typography).
- **Data & Storage**:
  - **Primary**: [Supabase PostgreSQL](https://supabase.com/) with full relational schema, RLS policies, sequence triggers, and composite indexes. When configured, Supabase is the sole source of truth.
  - **Zero-Config Fallback**: Built-in resilient in-memory repository pre-seeded with 14 realistic tickets, 12 employees, 11 team members, audit logs, and notifications. Runs out of the box if Supabase keys are not present.
- **Analytics & Visualizations**: [Recharts](https://recharts.org/) for executive dashboards.
- **Interactive Workflows**: [Mermaid.js](https://mermaid.js.org/) dynamic diagrams with instant SVG / PNG downloads.
- **AI Classification**: Optional Google Gemini 1.5 Flash fallback (completely skipped when `GEMINI_API_KEY` is omitted).
- **Security & Access Control**: Administrator access protected by an `ADMIN_PASSCODE` backed by signed HMAC-SHA256 session cookies (`AUTH_SECRET`).

---

## 🔑 Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `ADMIN_PASSCODE` | **Yes** | Passcode required to unlock `/admin` and `/dashboard` operations. |
| `AUTH_SECRET` | Recommended | Random secret string for signing HMAC-SHA256 session cookies (falls back to `ADMIN_PASSCODE`). |
| `CRON_SECRET` | Recommended | Bearer secret token used by Vercel Cron to trigger `/api/cron/escalate`. |
| `NEXT_PUBLIC_APP_URL` | Optional | Base URL of deployment (e.g. `https://p57-employee-desk.vercel.app` or `http://localhost:3000`). |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase Project URL. If omitted, system runs in in-memory demo mode. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase Service Role Secret Key for secure server-side database access. |
| `GEMINI_API_KEY` | Optional | Google Gemini API Key for low-confidence AI fallback categorization. |

---

## ⚡ Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: v18.18.0 or newer
- **npm**: v9 or newer

### 2. Clone and Install
```bash
git clone https://github.com/rebeluni/57_poc.git
cd 57_poc
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Set your desired `ADMIN_PASSCODE` (e.g. `ADMIN_PASSCODE=mysecurepass123`).

### 4. Optional: Supabase Database Setup
To use Supabase as your persistent database:
1. Open your Supabase project dashboard and go to **SQL Editor**.
2. Run [`supabase/schema.sql`](file:///supabase/schema.sql) to create tables, indexes, RLS policies, and the sequence generator.
3. Run [`supabase/seed.sql`](file:///supabase/seed.sql) to populate initial team members, employees, and 14 realistic tickets.
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to your `.env.local`.

*(If you skip this step, the app automatically runs in zero-config demo mode using its pre-seeded in-memory store).*

### 5. Run the Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 6. Run Automated Unit Tests
```bash
npm test
```
All 10/10 assertions will execute and pass via `tsx test/engine.test.ts`.

---

## 📱 Omnichannel Ingestion Endpoint (`POST /api/intake`)

The public intake webhook accepts incoming requests from external communication channels (Email, WhatsApp, SMS, Web Form, Instagram DM, Intercom Chat):

```bash
curl -X POST http://localhost:3000/api/intake \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "WhatsApp",
    "subject": "Wi-Fi down in studio 2",
    "description": "Sound system and iPad cannot connect to studio Wi-Fi ahead of 10am class",
    "employee_email": "priya.nair@physique57.com"
  }'
```

---

## 🤖 Optional Telegram Channel Bot Integration

The system includes a fully functional, optional Telegram omnichannel bot integration that routes real-time chat messages through the exact same triaging, prioritization, and SLA engine as web forms and emails.

### 4-Step Setup Guide:
1. **Create Bot in @BotFather**:
   * Open Telegram and search for [`@BotFather`](https://t.me/BotFather).
   * Send `/newbot`, name your bot (e.g., *Physique 57 Support*), and choose a unique username ending in `bot` (e.g., `p57_support_bot`).
   * Copy the generated HTTP API Bot Token.
2. **Set Environment Variables**:
   * Add the following to `.env.local` (local) or **Vercel Settings → Environment Variables** (production):
     ```env
     TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
     TELEGRAM_WEBHOOK_SECRET="a-random-secret-string-of-your-choice"
     ```
3. **Register the Webhook**:
   * Run the helper script to register your public HTTPS endpoint with Telegram:
     ```bash
     node scripts/set-telegram-webhook.mjs
     ```
   * *(Note: Telegram requires a public HTTPS URL. For local testing, expose port 3000 via a tunnel like ngrok or run on your deployed Vercel URL)*.
4. **Chat & Submit Tickets**:
   * Open your bot in Telegram and send `/start`.
   * Link your employee account: `/link ananya.sharma@physique57.in` (validated against the HR directory).
   * Send any natural language message (e.g., *"Studio 2 AC is leaking water near barre"*).
   * The bot immediately triages the issue, assigns priority & SLA, and replies with:
     `Ticket created: REQ-YYYY-NNNN | Category: Operations | Priority: P2 | SLA target: <IST timestamp>`
   * Query status anytime: `/status REQ-YYYY-NNNN`

---

## 🔒 Security & Route Protection

* **Public Routes**:
  * `POST /api/intake`: Public submission with Zod validation and IP rate limiting (30 requests/minute).
  * `GET /api/track?id=REQ-...&email=...`: Public self-service tracking. Requires **both** Ticket ID and matching employee email; returns only public-safe status fields (no internal notes or actor details).
* **Protected Routes (401 without Admin Session)**:
  * `GET /api/tickets`
  * `GET / PATCH /api/tickets/[id]`
  * `GET /api/dashboard`
  * `POST /api/simulate`
  * `GET /api/auth/passcode`
* **Automated Escalation Route**:
  * `GET /api/cron/escalate`: Authenticated via Bearer token (`CRON_SECRET`) or an active admin cookie.

---

## 🚢 Deploying to Vercel (Free Tier)

1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), click **Add New Project** and import the repository.
3. In **Environment Variables**, configure:
   * `ADMIN_PASSCODE` (Required)
   * `AUTH_SECRET` (Recommended: generate a 32-character random string)
   * `CRON_SECRET` (Recommended: generate a secret string for cron authentication)
   * `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Optional)
4. Click **Deploy**.
5. **Scheduled Escalations (`vercel.json`)**:
   * Vercel Hobby accounts support 1 daily cron job. A daily schedule (`0 3 * * *`) is configured in `vercel.json` to hit `/api/cron/escalate`.
   * Intraday SLA escalations are checked dynamically on load whenever an administrator opens the `/admin` or `/dashboard` console, ensuring zero monitoring lag.

---

## ⚠️ Known Limitations & Scope Boundaries

1. **Single Shared Admin Passcode**: Built for evaluator convenience during technical assessment. Production Phase 2 would implement Okta / Google Workspace SSO with discrete role-based permissions (Instructors, Studio Managers, Department Heads).
2. **Standardized REST Intake vs. Paid Gateway Subscriptions**: External services (Twilio WhatsApp, SendGrid Inbound Parse) require paid vendor accounts and DNS MX routing. This POC provides the production-ready REST ingestion adapter and normalization logic.
3. **Simulated In-App Notifications**: Escalations and P1 alerts create structured records in the `notifications` table rather than sending paid SMS or push notifications.
4. **Optional AI Fallback**: Google Gemini 1.5 Flash is invoked only when `GEMINI_API_KEY` is present and rule-based keyword confidence is low; if the key is absent, the system operates 100% deterministically at sub-millisecond latency.
