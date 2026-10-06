# Solution Summary: Employee Request Management System (ERMS)
**Candidate Assessment Submission | Physique 57 Technical Evaluation**  
**Role:** Senior Full-Stack Engineer & Product Designer  
**Format:** Architectural Brief & Operational Rationale (Part 3 Deliverable)

---

## 1. Executive Summary & Problem Context
Physique 57’s studio operations, frontline talent, and corporate staff currently rely on informal, fragmented communication channels (Email, WhatsApp, SMS, and ad-hoc direct messaging) to register HR, IT, Payroll, and Studio Operations inquiries. This manual paradigm introduces four compounding organizational failures:
1. **Lack of Visibility:** Inquiries are siloed in individual inboxes; leadership lacks centralized oversight.
2. **Accountability Gaps:** Tickets lack explicit departmental ownership and deterministic SLA tracking.
3. **Latent Response Times:** Requests languish in manual triaging queues before reaching the correct specialist.
4. **Data Inconsistency:** Inability to aggregate systemic operational bottlenecks across studio locations.

This prototype demonstrates an **enterprise-grade, zero-licensing-overhead Employee Request Management System (ERMS)** engineered to transform these manual inefficiencies into an automated, auditable, and SLA-governed pipeline.

---

## 2. Foundational Assumptions

### 2.1 User Personas & Behavioral Realities
* **Frontline Studio Staff & Barre Instructors (Requesters):** Mobile-first, time-constrained between back-to-back classes. They will not adopt complex enterprise ticketing software requiring multi-factor logins. Submissions must be effortless (one-click pre-fills, public tracking links, and seamless WhatsApp/Email ingestion).
* **Department Coordinators & Leads (Fulfillers):** Require an uncluttered triage queue, explicit ownership indicators, clear SLA breach countdowns, and a disciplined state machine (**Open** → **Active** → **Finalized**).
* **Executive Leadership (Auditors):** Require aggregate operational visibility into ticket velocity, compliance percentages, and recurring departmental friction points.

### 2.2 Operational Constraints & Business Hours
* **Operating Calendar:** The Physique 57 Support Desk operates on **Indian Standard Time (IST)**, Monday through Saturday from **09:00 to 19:00 IST**, excluding Sundays.
* **SLA Calculation:** SLA deadlines pause outside operating hours and on Sundays. A high-priority ticket submitted Saturday at 18:30 IST resumes its clock Monday at 09:00 IST, preventing artificial metric degradation.
* **Archival Protocol:** Finalized tickets remain reopenable for 7 calendar days before entering immutable, read-only archival.

---

## 3. Architectural Justification & Systems Design

### 3.1 Technology Stack Rationalization
* **Next.js 15+ (App Router, React 19, TypeScript):** Selected for unified full-stack velocity. Server Components provide zero-bundle overhead for data retrieval, while Route Handlers offer edge-ready API endpoints (`/api/intake`, `/api/tickets`, `/api/dashboard`).
* **Tailwind CSS & Curated Aesthetic:** Avoids generic enterprise UI kits. The interface embodies Physique 57’s luxury wellness identity: high-contrast dark slate (`#0F172A`), warm off-white canvas (`#FAFAFA`), electric cyan highlights (`#0EA5E9`), Playfair Display editorial headings, and clean Inter typography.
* **Database & Persistence Strategy:**
  * **Relational Schema (Supabase PostgreSQL):** Normalized relational structure (`employees`, `team_members`, `tickets`, `ticket_events`, `notifications`) with foreign key constraints, composite B-tree indexes, and Row-Level Security (RLS).
  * **Resilient Dual-Mode Repository:** Engineered with an automatic in-memory fallback pre-seeded with 14 realistic operational tickets. Reviewers can test the application in zero-configuration sandbox environments without cloud dependency failures.
* **Access Control:** Employs an `ADMIN_PASSCODE` mechanism backed by signed HMAC-SHA256 server-side `httpOnly`, `sameSite=lax` session cookies. This eliminates authentication friction for external evaluators while keeping internal triage tools secure.

### 3.2 Core Operational Mechanics
1. **Human-Readable Alphanumeric Identifiers:** Every record generates a sequential, human-friendly reference format (`REQ-2026-XXXX`), ensuring clarity during verbal, SMS, or WhatsApp follow-ups.
2. **Deterministic State Machine:** Enforces operational discipline:
   * *Open:* Incoming ticket awaiting acceptance.
   * *Active:* Claimed by an owner; automatically logs the exact timestamp of **First Response**.
   * *Finalized:* Requires a mandatory, minimum-length **Resolution Note** explaining the remedy.
3. **Append-Only Audit Ledger (`ticket_events`):** Every status jump, reassignment, category override, and internal note is recorded with timestamp and actor identity, guaranteeing data consistency.

---

## 4. Automation & Artificial Intelligence: High-ROI Value Nodes

Rather than indiscriminately applying LLMs to every node, the architecture deploys automation where it yields the highest return on operational velocity, determinism, and cost:

```
[Omnichannel Inflow] ──► [Deterministic Keyword Triaging (Sub-1ms, 0$)] ──► [Optional Gemini Fallback]
                                       │
                                       ▼
                       [Least-Loaded Assignee Routing]
                                       │
                                       ▼
                       [IST Business-Hours SLA Engine]
                                       │
                                       ▼
                       [Automated L0–L3 Escalation Watchdog]
```

### High-ROI Node 1: Deterministic Rule-First Triaging (Sub-1ms, Zero Cost)
* **Rationale:** 85–90% of internal studio inquiries follow predictable vocabulary ("Wi-Fi", "sound system", "direct deposit", "maternity leave"). 
* **Implementation:** A weighted keyword scoring matrix evaluates subject and description bodies against categorized lexicons (HR, IT, Payroll, Operations). 
* **AI Fallback:** Google Gemini 1.5 Flash is invoked only when keyword confidence falls below threshold (< 0.40) or when ambiguous studio idioms arise. This eliminates recurring token costs and guarantees zero latency for standard requests.

### High-ROI Node 2: Load-Balanced Dynamic Routing & OOO Protection
* **Rationale:** Manual routing creates bottlenecks when tickets cluster on a single coordinator or when an assignee is on leave.
* **Implementation:** Incoming tickets query active departmental specialists and route to the team member with the fewest open tickets (`least-open-tickets`). If a team member is marked **Out of Office (OOO)**, the engine automatically routes to the designated Department Lead.

### High-ROI Node 3: IST Business-Hours Escalation Watchdog (L0–L3)
* **Rationale:** Accountability breaks down when tickets stagnate without active monitoring.
* **Implementation:** An automated watchdog monitors resolution elapsed times:
  * **L0 (On Track):** 0–79% of SLA duration.
  * **L1 (Warning):** At 80% elapsed time, triggers visual warnings and in-app notifications.
  * **L2 (Breached):** At 100% elapsed time, escalates directly to Department Lead.
  * **L3 (Critical):** At 150%+ elapsed time, escalates to Studio Operations Head.

### High-ROI Node 4: Near-Duplicate Prevention (Jaccard Token Similarity)
* **Rationale:** Employees anxious about urgent issues frequently resubmit via both WhatsApp and Email within minutes.
* **Implementation:** Evaluates 24-hour sender history using token overlap similarity. Potential duplicates are flagged in the admin console to prevent split triage.

---

## 5. Scalability Roadmap & Long-Term Evolution

Given expanded enterprise engineering resources, the solution scales across four progressive phases:

### Phase 1: Native Omnichannel Ingestion Gateways (0–3 Months)
* **Twilio / Meta WhatsApp Business API:** Bi-directional messaging webhooks allowing employees to submit tickets via WhatsApp and receive instant resolution updates directly in their chat thread.
* **Inbound Email Parser (SendGrid / Postmark):** Converts incoming `helpdesk@physique57.com` emails into structured tickets and threads employee email replies back into ticket notes.

### Phase 2: Role-Based Access Control (RBAC) & Multi-Studio Partitioning (3–6 Months)
* **Granular RBAC:** Integration with Google Workspace / Okta Single Sign-On (SSO) with discrete roles (`Instructor`, `Studio Manager`, `Department Specialist`, `Executive`).
* **Multi-Studio Tenancy:** Geographic segmentation allowing studio managers to filter and isolate tickets by physical studio location (e.g., Bandra, South Mumbai, Dubai).

### Phase 3: Autonomous AI Agent Co-Pilots (6–9 Months)
* **RAG-Powered Instant Resolution:** Ingest Physique 57 internal employee handbooks, leave policies, and studio tech manuals into a vector store (e.g., pgvector). For routine queries ("How many casual leaves do I have left?"), the AI drafts verified instant answers, requiring zero human intervention.
* **Smart Auto-Complete for Technicians:** Suggested canned responses and diagnostic runbooks based on historical resolution notes.

### Phase 4: Preventative Studio Telemetry & Predictive Maintenance (9–12 Months)
* **IoT Hardware Heartbeats:** Connect studio audio systems, Wi-Fi access points, and tablet check-in kiosks to automated health probes. If an amplifier or access point drops offline before the morning class rush, a P1 Operations ticket auto-generates before frontline staff even notice the failure.

---

## 6. Verification & Evaluation Guide

* **Live Prototype URL:** `https://your-vercel-domain.vercel.app` (or `http://localhost:3000`)
* **Admin Passcode:** Configured via `ADMIN_PASSCODE` environment variable
* **Test Scenarios:** 6 pre-configured realistic operational test presets on the intake form (`/`).
* **Workflow Visual:** High-resolution interactive 7-stage lifecycle diagram available at `/workflow`.
* **Automated Test Suite:** 10/10 automated assertions passing via `npm test` (`tsx test/engine.test.ts`).
