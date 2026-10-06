// ==============================================================================
// Physique 57 · People Desk
// Central Source of Truth: Operational Rules, Categorisation, Priority & SLAs
// ==============================================================================

export type DepartmentCategory = 'HR' | 'IT' | 'Payroll' | 'Operations' | 'Other';
export type TicketPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type TicketStatus = 'open' | 'active' | 'finalized';
export type EscalationLevel = 'L0' | 'L1' | 'L2' | 'L3';
export type TicketChannel = 'Web Form' | 'Email' | 'WhatsApp' | 'SMS' | 'Instagram DM' | 'Intercom Chat' | 'Telegram';

export interface KeywordRule {
  keyword: string;
  weight: number; // Higher weight for distinctive phrases
}

export interface CategoryDefinition {
  name: DepartmentCategory;
  displayName: string;
  description: string;
  badgeColor: string;
  keywords: KeywordRule[];
  defaultOwnerRole: string;
}

export interface PriorityDefinition {
  level: TicketPriority;
  name: string;
  description: string;
  badgeVariant: 'critical' | 'high' | 'normal' | 'low';
  color: string;
  criteria: string;
}

export interface SLADefinition {
  priority: TicketPriority;
  responseHours: number; // In business hours
  resolveHours: number; // In business hours
  responseLabel: string;
  resolveLabel: string;
}

export interface EscalationThreshold {
  level: EscalationLevel;
  percentage: number;
  label: string;
  action: string;
  targetRole: 'owner' | 'team_lead' | 'dept_head';
}

// ------------------------------------------------------------------------------
// 1. Categorisation Engine Rules
// ------------------------------------------------------------------------------
export const CATEGORY_CONFIG: Record<DepartmentCategory, CategoryDefinition> = {
  Payroll: {
    name: 'Payroll',
    displayName: 'Finance & Payroll',
    description: 'Salaries, reimbursements, tax deductions, bonuses, and payslips.',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    defaultOwnerRole: 'Payroll Specialist',
    keywords: [
      { keyword: 'salary', weight: 3 },
      { keyword: 'payslip', weight: 3 },
      { keyword: 'pay slip', weight: 3 },
      { keyword: 'payroll', weight: 3 },
      { keyword: 'reimbursement', weight: 3 },
      { keyword: 'bonus', weight: 2 },
      { keyword: 'tax', weight: 2 },
      { keyword: 'tds', weight: 3 },
      { keyword: 'form 16', weight: 3 },
      { keyword: 'deduction', weight: 2 },
      { keyword: 'not credited', weight: 3 },
      { keyword: 'overtime', weight: 2 },
      { keyword: 'compensation', weight: 2 },
    ],
  },
  HR: {
    name: 'HR',
    displayName: 'People & Culture (HR)',
    description: 'Leaves, holidays, medical insurance, onboarding, appraisals, and policies.',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    defaultOwnerRole: 'People Partner',
    keywords: [
      { keyword: 'leave', weight: 3 },
      { keyword: 'holiday', weight: 2 },
      { keyword: 'vacation', weight: 2 },
      { keyword: 'onboarding', weight: 3 },
      { keyword: 'policy', weight: 2 },
      { keyword: 'resignation', weight: 3 },
      { keyword: 'appraisal', weight: 3 },
      { keyword: 'benefits', weight: 2 },
      { keyword: 'insurance', weight: 3 },
      { keyword: 'id card', weight: 3 },
      { keyword: 'attendance regularisation', weight: 3 },
      { keyword: 'attendance', weight: 2 },
      { keyword: 'maternity', weight: 3 },
      { keyword: 'paternity', weight: 3 },
    ],
  },
  IT: {
    name: 'IT',
    displayName: 'IT & Digital Systems',
    description: 'Laptops, Wi-Fi, passwords, Mindbody POS, email access, and peripherals.',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    defaultOwnerRole: 'Systems Engineer',
    keywords: [
      { keyword: 'laptop', weight: 3 },
      { keyword: 'login', weight: 2 },
      { keyword: 'password', weight: 3 },
      { keyword: 'access', weight: 2 },
      { keyword: 'wifi', weight: 3 },
      { keyword: 'vpn', weight: 3 },
      { keyword: 'software', weight: 2 },
      { keyword: 'email not working', weight: 3 },
      { keyword: 'printer', weight: 3 },
      { keyword: 'system down', weight: 4 },
      { keyword: 'app crash', weight: 3 },
      { keyword: 'mindbody', weight: 3 },
      { keyword: 'ipad', weight: 2 },
      { keyword: 'hardware', weight: 2 },
    ],
  },
  Operations: {
    name: 'Operations',
    displayName: 'Studio Operations & Facilities',
    description: 'Studio barre maintenance, audio/sound systems, mirrors, props, and cleaning.',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    defaultOwnerRole: 'Studio Operations Lead',
    keywords: [
      { keyword: 'studio', weight: 2 },
      { keyword: 'equipment', weight: 3 },
      { keyword: 'schedule', weight: 2 },
      { keyword: 'class', weight: 2 },
      { keyword: 'instructor', weight: 2 },
      { keyword: 'mirror', weight: 3 },
      { keyword: 'barre', weight: 3 },
      { keyword: 'sound system', weight: 3 },
      { keyword: 'cleaning', weight: 3 },
      { keyword: 'inventory', weight: 2 },
      { keyword: 'facility', weight: 2 },
      { keyword: 'air conditioning', weight: 3 },
      { keyword: 'ac broken', weight: 3 },
      { keyword: 'mats', weight: 2 },
    ],
  },
  Other: {
    name: 'Other',
    displayName: 'General / Triage Queue',
    description: 'Requests requiring manual categorization or outside standard departments.',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    defaultOwnerRole: 'Helpdesk Coordinator',
    keywords: [],
  },
};

// ------------------------------------------------------------------------------
// 2. Priority Matrix Configuration
// ------------------------------------------------------------------------------
export const PRIORITY_CONFIG: Record<TicketPriority, PriorityDefinition> = {
  P1: {
    level: 'P1',
    name: 'P1 · Critical',
    description: 'Business-critical blockers, salary delays, studio safety issues, or studio outages.',
    badgeVariant: 'critical',
    color: '#EF4444',
    criteria: 'Salary not credited, system down, studio outage, broken glass/mirror hazard, or urgent payroll/IT issue.',
  },
  P2: {
    level: 'P2',
    name: 'P2 · High',
    description: 'Time-sensitive disruptions affecting client check-in or upcoming classes.',
    badgeVariant: 'high',
    color: '#F97316',
    criteria: 'Marked urgent by requester, sound system malfunction, Wi-Fi outage at front desk, app crashes.',
  },
  P3: {
    level: 'P3',
    name: 'P3 · Normal',
    description: 'Standard daily business requests and workflows.',
    badgeVariant: 'normal',
    color: '#0EA5E9',
    criteria: 'Leave approvals, expense reimbursements, equipment replenishment, routine queries.',
  },
  P4: {
    level: 'P4',
    name: 'P4 · Low',
    description: 'Informational or non-urgent administrative queries.',
    badgeVariant: 'low',
    color: '#64748B',
    criteria: 'General policy questions, visitor parking queries, building access stickers.',
  },
};

// ------------------------------------------------------------------------------
// 3. SLA Service Level Agreement Configuration (IST Business Hours: 9am - 7pm, Mon-Sat)
// ------------------------------------------------------------------------------
export const BUSINESS_HOURS = {
  startHour: 9, // 09:00 IST
  endHour: 19, // 19:00 IST (10 hours per day)
  hoursPerDay: 10,
  workDays: [1, 2, 3, 4, 5, 6], // Monday (1) to Saturday (6). Sunday (0) is off.
  timezone: 'Asia/Kolkata',
  utcOffsetMinutes: 330, // UTC+5:30
};

export const SLA_CONFIG: Record<TicketPriority, SLADefinition> = {
  P1: {
    priority: 'P1',
    responseHours: 1, // 1 business hour
    resolveHours: 4, // 4 business hours
    responseLabel: '1 Business Hour',
    resolveLabel: '4 Business Hours',
  },
  P2: {
    priority: 'P2',
    responseHours: 4, // 4 business hours
    resolveHours: 10, // 1 business day (10 business hours)
    responseLabel: '4 Business Hours',
    resolveLabel: '1 Business Day (10 hrs)',
  },
  P3: {
    priority: 'P3',
    responseHours: 10, // 1 business day (10 business hours)
    resolveHours: 30, // 3 business days (30 business hours)
    responseLabel: '1 Business Day',
    resolveLabel: '3 Business Days',
  },
  P4: {
    priority: 'P4',
    responseHours: 20, // 2 business days
    resolveHours: 50, // 5 business days
    responseLabel: '2 Business Days',
    resolveLabel: '5 Business Days',
  },
};

// ------------------------------------------------------------------------------
// 4. Escalation Ladder Configuration
// ------------------------------------------------------------------------------
export const ESCALATION_THRESHOLDS: EscalationThreshold[] = [
  {
    level: 'L0',
    percentage: 0,
    label: 'On Track',
    action: 'Ticket is well within SLA service window.',
    targetRole: 'owner',
  },
  {
    level: 'L1',
    percentage: 80,
    label: 'Breaching Soon (80%)',
    action: 'Alert current assignee/owner to expedite handling.',
    targetRole: 'owner',
  },
  {
    level: 'L2',
    percentage: 100,
    label: 'SLA Breached (100%)',
    action: 'Escalate to Team Lead. Trigger high-priority alert.',
    targetRole: 'team_lead',
  },
  {
    level: 'L3',
    percentage: 150,
    label: 'Severe Breach (150%)',
    action: 'Escalate directly to Department Head. Flag in executive dashboard.',
    targetRole: 'dept_head',
  },
];

// ------------------------------------------------------------------------------
// 5. Channels Supported
// ------------------------------------------------------------------------------
export const SUPPORTED_CHANNELS: TicketChannel[] = [
  'Web Form',
  'Email',
  'WhatsApp',
  'SMS',
  'Instagram DM',
  'Intercom Chat',
  'Telegram',
];

// ------------------------------------------------------------------------------
// 6. Pre-filled Realistic Test Examples for the Requester Form
// ------------------------------------------------------------------------------
export interface FormExample {
  title: string;
  name: string;
  email: string;
  employeeId: string;
  channel: TicketChannel;
  subject: string;
  description: string;
  urgent: boolean;
}

export const PREFILL_EXAMPLES: FormExample[] = [
  {
    title: 'Salary not credited this month',
    name: 'Ananya Sharma',
    email: 'ananya.sharma@physique57.in',
    employeeId: 'P57-EMP-014',
    channel: 'WhatsApp',
    subject: 'Salary not credited for September payroll batch',
    description: 'My salary has not been credited to HDFC bank yet. Other instructors already received credit notices yesterday. Please look into this urgently.',
    urgent: true,
  },
  {
    title: "Laptop won't connect to studio wifi",
    name: 'Rohan Mehta',
    email: 'rohan.mehta@physique57.in',
    employeeId: 'P57-EMP-022',
    channel: 'Email',
    subject: 'Front desk laptop disconnected from studio wifi Bandra',
    description: 'The front desk laptop is failing 802.1x enterprise authentication on the Bandra studio Wi-Fi. Check-ins are lagging.',
    urgent: false,
  },
  {
    title: 'Apply for 3 days leave next week',
    name: 'Pooja Iyer',
    email: 'pooja.iyer@physique57.in',
    employeeId: 'P57-EMP-031',
    channel: 'Web Form',
    subject: 'Apply for 3 days leave next week',
    description: 'Requesting planned leave from Oct 12 to Oct 14. Class covers have been verified and confirmed with Tara Alvares.',
    urgent: false,
  },
  {
    title: 'Reimbursement for class equipment',
    name: 'Tara Alvares',
    email: 'tara.alvares@physique57.in',
    employeeId: 'P57-EMP-019',
    channel: 'Web Form',
    subject: 'Reimbursement for class equipment resistance loops',
    description: 'Purchased 15 high-density resistance loop bands for the new core sculpting choreography. Total invoice is Rs. 3,200.',
    urgent: false,
  },
  {
    title: 'Studio mirror broken at Bandra',
    name: 'Rohan Mehta',
    email: 'rohan.mehta@physique57.in',
    employeeId: 'P57-EMP-022',
    channel: 'SMS',
    subject: 'Studio mirror broken at Bandra Room 2',
    description: 'Corner mirror in Room 2 got cracked along the lower edge after class dumbbell contact. Potential hazard for clients.',
    urgent: true,
  },
  {
    title: 'Question about office parking',
    name: 'Sneha Kapoor',
    email: 'sneha.kapoor@physique57.in',
    employeeId: 'P57-EMP-045',
    channel: 'Instagram DM',
    subject: 'Question about office parking and building access',
    description: 'Do instructors traveling between Bandra and Khar studios get reimbursed for municipal parking or provided building passes?',
    urgent: false,
  },
];

// ------------------------------------------------------------------------------
// 7. System Assumptions & Operational Logic Notes
// ------------------------------------------------------------------------------
export const OPERATIONAL_ASSUMPTIONS = [
  {
    title: 'Strict Business Hours (IST)',
    description: 'Working hours are Mon–Sat 9:00 AM to 7:00 PM IST (10 hours/day). Sundays are excluded from SLA clocks. Any ticket arriving at 6:30 PM on Saturday rolls its resolution clock forward to Monday morning.',
  },
  {
    title: 'Least-Open-Tickets Intelligent Routing',
    description: 'When routed to a department, tickets are dynamically assigned to the active team member with the fewest open/active tickets. Members flagged out-of-office are bypassed in favor of the designated Team Lead.',
  },
  {
    title: 'Confidence-Based AI Fallback Threshold',
    description: 'Deterministic keyword scoring evaluates keyword weights. If normalized confidence score is >= 0.60, the rule is accepted. Below 0.60, the optional Gemini AI classifier is consulted. If still ambiguous, it routes to Human Triage.',
  },
  {
    title: 'Omni-Channel Normalisation',
    description: 'Whether ingested via WhatsApp Business, Instagram DM, Intercom webhook, SMS, or Email, all incoming messages are normalised into a standard schema with channel lineage preserved.',
  },
  {
    title: '7-Day Archival Policy & Strict State Machine',
    description: 'Tickets transition strictly: Open -> Active (records first response) -> Finalized (requires resolution note). Tickets finalized within 7 days may be reopened with a logged justification; older tickets become archived.',
  },
  {
    title: 'Duplicate Detection',
    description: 'Incoming requests with the same sender email, matching category, and high lexical overlap within a 24-hour window are linked to the parent ticket with an alert, preventing double-working.',
  },
];
