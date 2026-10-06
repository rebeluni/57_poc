// ==============================================================================
// Physique 57 · People Desk
// Unified Repository Architecture (Supabase Postgres & In-Memory Fallback)
// ==============================================================================

import { getSupabaseServerClient, isSupabaseConfigured } from './supabase';
import {
  INITIAL_EMPLOYEES,
  INITIAL_TEAM_MEMBERS,
  INITIAL_TICKETS,
  INITIAL_EVENTS,
  INITIAL_NOTIFICATIONS,
} from './seed-data';
import {
  DepartmentCategory,
  TicketPriority,
  TicketStatus,
  EscalationLevel,
  TicketChannel,
  SUPPORTED_CHANNELS,
} from './config';

const DEPARTMENT_CATEGORIES: DepartmentCategory[] = [
  'HR',
  'IT',
  'Payroll',
  'Operations',
  'Other',
];
import {
  Employee,
  TeamMember,
  Ticket,
  TicketEvent,
  NotificationItem,
} from './types';
import { evaluateSLAState, calculateSLACompliance, countSLABreaches } from './sla';

export interface TicketFilters {
  status?: string;
  category?: string;
  priority?: string;
  channel?: string;
  assigneeId?: string;
  search?: string;
  slaState?: string;
  includeArchived?: boolean;
}

export interface DashboardMetrics {
  kpis: {
    total: number;
    open: number;
    active: number;
    finalized: number;
    breached: number;
    breachingSoon: number;
    slaCompliancePercent: number;
    avgResponseHours: string;
    avgResolveHours: string;
  };
  byDepartment: {
    department: DepartmentCategory;
    name: DepartmentCategory;
    open: number;
    breached: number;
    count: number;
  }[];
  byChannel: {
    channel: string;
    name: string;
    count: number;
  }[];
  byPriority: {
    priority: TicketPriority;
    name: TicketPriority;
    count: number;
  }[];
  volumeTrend: {
    date: string;
    submitted: number;
    created: number;
    resolved: number;
  }[];
  complianceByDept: {
    department: DepartmentCategory;
    compliancePercent: number | null;
    rate: number | null;
    resolvedCount: number;
  }[];
  needsAttention: Ticket[];
}

/**
 * Enriches raw ticket row with live SLA calculation and assignee details
 */
export function enrichTicket(ticket: Ticket, teamMembers: TeamMember[]): Ticket {
  const assignee = teamMembers.find((m) => m.id === ticket.assignee_id) || null;
  const sla = evaluateSLAState(ticket.created_at, ticket.resolve_due_at, ticket.resolved_at, ticket.status);

  return {
    ...ticket,
    assignee,
    sla_state: sla.slaState,
    sla_elapsed_percent: sla.elapsedPercent,
    time_remaining_str: sla.timeRemainingStr,
  };
}

/**
 * Strips computed and non-database fields from ticket object before write
 */
function sanitizeTicketForDb(ticket: Partial<Ticket>): Record<string, any> {
  const allowed = [
    'id',
    'ticket_number',
    'requester_name',
    'requester_email',
    'requester_employee_id',
    'channel',
    'subject',
    'description',
    'category',
    'category_source',
    'category_confidence',
    'matched_keywords',
    'priority',
    'status',
    'assignee_id',
    'urgent_flag',
    'response_due_at',
    'resolve_due_at',
    'first_response_at',
    'resolved_at',
    'resolution_note',
    'escalation_level',
    'possible_duplicate_of',
    'archived',
    'created_at',
    'updated_at',
  ];

  const sanitized: Record<string, any> = {};
  for (const key of allowed) {
    if ((ticket as any)[key] !== undefined) {
      sanitized[key] = (ticket as any)[key];
    }
  }
  return sanitized;
}

// ==============================================================================
// Repository Interface
// ==============================================================================

export interface TicketRepository {
  getAllEmployees(): Promise<Employee[]>;
  getAllTeamMembers(): Promise<TeamMember[]>;
  getTickets(filters?: TicketFilters): Promise<Ticket[]>;
  getTicketByNumber(ticketNumber: string, email?: string): Promise<Ticket | null>;
  getTicketById(idOrNumber: string): Promise<Ticket | null>;
  getTicketEvents(ticketIdOrNumber: string): Promise<TicketEvent[]>;
  getNotifications(limit?: number): Promise<NotificationItem[]>;
  createTicket(
    ticketData: Omit<
      Ticket,
      | 'id'
      | 'ticket_number'
      | 'created_at'
      | 'updated_at'
      | 'sla_state'
      | 'sla_elapsed_percent'
      | 'time_remaining_str'
      | 'assignee'
    >,
    actor?: string
  ): Promise<Ticket>;
  transitionTicketStatus(
    ticketIdOrNumber: string,
    newStatus: TicketStatus,
    options: { note?: string; assigneeId?: string; actor?: string }
  ): Promise<{ success: boolean; ticket?: Ticket; error?: string }>;
  reassignTicket(
    ticketIdOrNumber: string,
    newAssigneeId: string | null,
    actor?: string
  ): Promise<{ success: boolean; ticket?: Ticket; error?: string }>;
  overrideTicket(
    ticketIdOrNumber: string,
    updates: {
      category?: DepartmentCategory;
      priority?: TicketPriority;
      reason: string;
      actor?: string;
    }
  ): Promise<{ success: boolean; ticket?: Ticket; error?: string }>;
  addInternalNote(
    ticketIdOrNumber: string,
    note: string,
    actor?: string
  ): Promise<{ success: boolean; event?: TicketEvent; error?: string }>;
  runEscalationWatchdog(): Promise<{
    evaluatedCount: number;
    escalatedCount: number;
    archivedCount: number;
  }>;
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getTelegramLink(chatId: string): Promise<TelegramLink | null>;
  setTelegramLink(chatId: string, employeeEmail: string): Promise<TelegramLink>;
}

export interface TelegramLink {
  chat_id: string;
  employee_email: string;
  created_at: string;
}

// ==============================================================================
// Implementation 1: Memory Repository (Demo & Offline Mode)
// ==============================================================================

interface MemoryDatabase {
  employees: Employee[];
  teamMembers: TeamMember[];
  tickets: Ticket[];
  events: TicketEvent[];
  notifications: NotificationItem[];
  telegramLinks: TelegramLink[];
  nextTicketSeq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __P57_DB: MemoryDatabase | undefined;
}

function getMemoryDb(): MemoryDatabase {
  if (!global.__P57_DB) {
    global.__P57_DB = {
      employees: JSON.parse(JSON.stringify(INITIAL_EMPLOYEES)),
      teamMembers: JSON.parse(JSON.stringify(INITIAL_TEAM_MEMBERS)),
      tickets: JSON.parse(JSON.stringify(INITIAL_TICKETS)),
      events: JSON.parse(JSON.stringify(INITIAL_EVENTS)),
      notifications: JSON.parse(JSON.stringify(INITIAL_NOTIFICATIONS)),
      telegramLinks: [],
      nextTicketSeq: 15,
    };
  }
  return global.__P57_DB;
}

class MemoryRepo implements TicketRepository {
  async getAllEmployees(): Promise<Employee[]> {
    return getMemoryDb().employees;
  }

  async getAllTeamMembers(): Promise<TeamMember[]> {
    const db = getMemoryDb();
    const loadMap = new Map<string, number>();
    db.tickets.forEach((t) => {
      if (t.assignee_id && (t.status === 'open' || t.status === 'active')) {
        loadMap.set(t.assignee_id, (loadMap.get(t.assignee_id) || 0) + 1);
      }
    });

    return db.teamMembers.map((m) => ({
      ...m,
      open_tickets_count: loadMap.get(m.id) || 0,
    }));
  }

  async getTickets(filters?: TicketFilters): Promise<Ticket[]> {
    const db = getMemoryDb();
    let tickets = [...db.tickets];

    if (!filters?.includeArchived) {
      tickets = tickets.filter((t) => !t.archived);
    }
    if (filters?.status && filters.status !== 'all') {
      tickets = tickets.filter((t) => t.status === filters.status);
    }
    if (filters?.category && filters.category !== 'all') {
      tickets = tickets.filter((t) => t.category === filters.category);
    }
    if (filters?.priority && filters.priority !== 'all') {
      tickets = tickets.filter((t) => t.priority === filters.priority);
    }
    if (filters?.channel && filters.channel !== 'all') {
      tickets = tickets.filter((t) => t.channel === filters.channel);
    }
    if (filters?.assigneeId && filters.assigneeId !== 'all') {
      tickets = tickets.filter((t) => t.assignee_id === filters.assigneeId);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      tickets = tickets.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.ticket_number.toLowerCase().includes(q) ||
          t.requester_name.toLowerCase().includes(q) ||
          t.requester_email.toLowerCase().includes(q)
      );
    }

    const teamMembers = await this.getAllTeamMembers();
    let enriched = tickets.map((t) => enrichTicket(t, teamMembers));

    if (filters?.slaState && filters.slaState !== 'all') {
      enriched = enriched.filter((t) => t.sla_state === filters.slaState);
    }

    return enriched.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async getTicketByNumber(ticketNumber: string, email?: string): Promise<Ticket | null> {
    const db = getMemoryDb();
    const ticket = db.tickets.find(
      (t) => t.ticket_number.toUpperCase() === ticketNumber.toUpperCase()
    );
    if (!ticket) return null;
    if (email && ticket.requester_email.toLowerCase().trim() !== email.toLowerCase().trim()) {
      return null;
    }
    const teamMembers = await this.getAllTeamMembers();
    return enrichTicket(ticket, teamMembers);
  }

  async getTicketById(idOrNumber: string): Promise<Ticket | null> {
    const db = getMemoryDb();
    const norm = idOrNumber.trim();
    const ticket = db.tickets.find(
      (t) => t.id === norm || t.ticket_number.toUpperCase() === norm.toUpperCase()
    );
    if (!ticket) return null;
    const teamMembers = await this.getAllTeamMembers();
    return enrichTicket(ticket, teamMembers);
  }

  async getTicketEvents(ticketIdOrNumber: string): Promise<TicketEvent[]> {
    const db = getMemoryDb();
    const ticket = await this.getTicketById(ticketIdOrNumber);
    if (!ticket) return [];
    return db.events
      .filter((e) => e.ticket_id === ticket.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getNotifications(limit: number = 20): Promise<NotificationItem[]> {
    const db = getMemoryDb();
    return [...db.notifications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  async createTicket(
    ticketData: Omit<
      Ticket,
      | 'id'
      | 'ticket_number'
      | 'created_at'
      | 'updated_at'
      | 'sla_state'
      | 'sla_elapsed_percent'
      | 'time_remaining_str'
      | 'assignee'
    >,
    actor: string = 'System Engine'
  ): Promise<Ticket> {
    const db = getMemoryDb();
    const id = `33333333-3333-3333-3333-${Date.now().toString().slice(-12)}`;
    const year = new Date().getFullYear();
    const num = String(db.nextTicketSeq++).padStart(4, '0');
    const ticketNumber = `REQ-${year}-${num}`;
    const nowIso = new Date().toISOString();

    const newTicket: Ticket = {
      ...ticketData,
      id,
      ticket_number: ticketNumber,
      created_at: nowIso,
      updated_at: nowIso,
    };

    db.tickets.unshift(newTicket);

    db.events.unshift({
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ticket_id: id,
      actor,
      action: 'created',
      from_value: null,
      to_value: 'open',
      note: `Ticket created via ${newTicket.channel}. Auto-categorised as ${newTicket.category} (${Math.round(newTicket.category_confidence * 100)}% confidence).`,
      created_at: nowIso,
    });

    if (newTicket.assignee_id) {
      const assignee = db.teamMembers.find((m) => m.id === newTicket.assignee_id);
      db.events.unshift({
        id: `event-assign-${Date.now()}`,
        ticket_id: id,
        actor: 'Smart Routing Engine',
        action: 'assigned',
        from_value: null,
        to_value: assignee ? assignee.name : newTicket.assignee_id,
        note: `Assigned based on least open tickets in ${newTicket.category}.`,
        created_at: nowIso,
      });
    }

    if (newTicket.priority === 'P1') {
      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        ticket_id: id,
        recipient_role: 'team_lead',
        recipient_name: 'Department Lead',
        channel: 'In-App Alert',
        level: 'P1_ALERT',
        message: `CRITICAL P1 TICKET: "${newTicket.subject}" requires immediate intervention.`,
        is_read: false,
        created_at: nowIso,
      });
    }

    const teamMembers = await this.getAllTeamMembers();
    return enrichTicket(newTicket, teamMembers);
  }

  async transitionTicketStatus(
    ticketIdOrNumber: string,
    newStatus: TicketStatus,
    options: { note?: string; assigneeId?: string; actor?: string }
  ): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
    const db = getMemoryDb();
    const ticket = db.tickets.find(
      (t) =>
        t.id === ticketIdOrNumber ||
        t.ticket_number.toUpperCase() === ticketIdOrNumber.toUpperCase()
    );
    if (!ticket) return { success: false, error: 'Ticket not found.' };

    const currentStatus = ticket.status;
    const nowIso = new Date().toISOString();
    const actor = options.actor || 'Staff Member';

    if (currentStatus === 'open' && newStatus === 'active') {
      const effectiveAssignee = options.assigneeId || ticket.assignee_id;
      if (!effectiveAssignee) {
        return { success: false, error: 'Transitioning to Active requires an assigned owner.' };
      }
      ticket.assignee_id = effectiveAssignee;
      if (!ticket.first_response_at) {
        ticket.first_response_at = nowIso;
      }
      ticket.status = 'active';
      ticket.updated_at = nowIso;

      db.events.unshift({
        id: `event-${Date.now()}`,
        ticket_id: ticket.id,
        actor,
        action: 'status_change',
        from_value: 'open',
        to_value: 'active',
        note: options.note || 'Ticket accepted into active progress. First response recorded.',
        created_at: nowIso,
      });
    } else if (currentStatus === 'active' && newStatus === 'finalized') {
      if (!options.note || options.note.trim().length < 5) {
        return {
          success: false,
          error: 'Resolution note (at least 5 characters) is required to finalize.',
        };
      }
      ticket.status = 'finalized';
      ticket.resolved_at = nowIso;
      ticket.resolution_note = options.note.trim();
      ticket.updated_at = nowIso;

      db.events.unshift({
        id: `event-${Date.now()}`,
        ticket_id: ticket.id,
        actor,
        action: 'status_change',
        from_value: 'active',
        to_value: 'finalized',
        note: `Finalized with resolution note: "${ticket.resolution_note}"`,
        created_at: nowIso,
      });
    } else if (currentStatus === 'finalized' && newStatus === 'active') {
      const resolvedTime = ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : 0;
      const sevenDaysMs = 7 * 24 * 3600 * 1000;
      if (Date.now() - resolvedTime > sevenDaysMs || ticket.archived) {
        return {
          success: false,
          error: 'Tickets finalized more than 7 days ago cannot be reopened (Archived).',
        };
      }
      if (!options.note || options.note.trim().length < 5) {
        return {
          success: false,
          error: 'A justification note is required to reopen this finalized ticket.',
        };
      }

      ticket.status = 'active';
      ticket.resolved_at = null;
      ticket.updated_at = nowIso;

      db.events.unshift({
        id: `event-${Date.now()}`,
        ticket_id: ticket.id,
        actor,
        action: 'reopened',
        from_value: 'finalized',
        to_value: 'active',
        note: `Ticket reopened: "${options.note.trim()}"`,
        created_at: nowIso,
      });
    } else {
      return {
        success: false,
        error: `Invalid state jump from ${currentStatus} to ${newStatus}.`,
      };
    }

    const teamMembers = await this.getAllTeamMembers();
    return { success: true, ticket: enrichTicket(ticket, teamMembers) };
  }

  async reassignTicket(
    ticketIdOrNumber: string,
    newAssigneeId: string | null,
    actor: string = 'Staff Member'
  ): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
    const db = getMemoryDb();
    const ticket = db.tickets.find(
      (t) =>
        t.id === ticketIdOrNumber ||
        t.ticket_number.toUpperCase() === ticketIdOrNumber.toUpperCase()
    );
    if (!ticket) return { success: false, error: 'Ticket not found.' };

    const oldAssignee = db.teamMembers.find((m) => m.id === ticket.assignee_id);
    const newAssignee = db.teamMembers.find((m) => m.id === newAssigneeId);

    ticket.assignee_id = newAssigneeId;
    ticket.updated_at = new Date().toISOString();

    db.events.unshift({
      id: `event-${Date.now()}`,
      ticket_id: ticket.id,
      actor,
      action: 'reassigned',
      from_value: oldAssignee ? oldAssignee.name : 'Unassigned',
      to_value: newAssignee ? newAssignee.name : 'Unassigned',
      note: `Reassigned from ${oldAssignee ? oldAssignee.name : 'Unassigned'} to ${newAssignee ? newAssignee.name : 'Unassigned'}`,
      created_at: ticket.updated_at,
    });

    const teamMembers = await this.getAllTeamMembers();
    return { success: true, ticket: enrichTicket(ticket, teamMembers) };
  }

  async overrideTicket(
    ticketIdOrNumber: string,
    updates: {
      category?: DepartmentCategory;
      priority?: TicketPriority;
      reason: string;
      actor?: string;
    }
  ): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
    const db = getMemoryDb();
    const ticket = db.tickets.find(
      (t) =>
        t.id === ticketIdOrNumber ||
        t.ticket_number.toUpperCase() === ticketIdOrNumber.toUpperCase()
    );
    if (!ticket) return { success: false, error: 'Ticket not found.' };

    const actor = updates.actor || 'Staff Member';
    const nowIso = new Date().toISOString();

    if (updates.category && updates.category !== ticket.category) {
      const oldCat = ticket.category;
      ticket.category = updates.category;
      ticket.category_source = 'manual';

      db.events.unshift({
        id: `event-${Date.now()}-cat`,
        ticket_id: ticket.id,
        actor,
        action: 'category_override',
        from_value: oldCat,
        to_value: updates.category,
        note: `Category manually modified: ${updates.reason}`,
        created_at: nowIso,
      });
    }

    if (updates.priority && updates.priority !== ticket.priority) {
      const oldPri = ticket.priority;
      ticket.priority = updates.priority;

      db.events.unshift({
        id: `event-${Date.now()}-pri`,
        ticket_id: ticket.id,
        actor,
        action: 'priority_override',
        from_value: oldPri,
        to_value: updates.priority,
        note: `Priority manually modified: ${updates.reason}`,
        created_at: nowIso,
      });
    }

    ticket.updated_at = nowIso;
    const teamMembers = await this.getAllTeamMembers();
    return { success: true, ticket: enrichTicket(ticket, teamMembers) };
  }

  async addInternalNote(
    ticketIdOrNumber: string,
    note: string,
    actor: string = 'Staff Member'
  ): Promise<{ success: boolean; event?: TicketEvent; error?: string }> {
    const db = getMemoryDb();
    const ticket = db.tickets.find(
      (t) =>
        t.id === ticketIdOrNumber ||
        t.ticket_number.toUpperCase() === ticketIdOrNumber.toUpperCase()
    );
    if (!ticket) return { success: false, error: 'Ticket not found.' };

    const event: TicketEvent = {
      id: `event-note-${Date.now()}`,
      ticket_id: ticket.id,
      actor,
      action: 'note_added',
      note: note.trim(),
      created_at: new Date().toISOString(),
    };

    db.events.unshift(event);
    return { success: true, event };
  }

  async runEscalationWatchdog(): Promise<{
    evaluatedCount: number;
    escalatedCount: number;
    archivedCount: number;
  }> {
    const db = getMemoryDb();
    const now = Date.now();
    let escalatedCount = 0;
    let archivedCount = 0;

    for (const ticket of db.tickets) {
      if (ticket.status === 'open' || ticket.status === 'active') {
        const sla = evaluateSLAState(ticket.created_at, ticket.resolve_due_at, ticket.resolved_at, ticket.status);
        const oldLevel = ticket.escalation_level;
        let newLevel: EscalationLevel = 'L0';

        if (sla.elapsedPercent >= 150) newLevel = 'L3';
        else if (sla.elapsedPercent >= 100) newLevel = 'L2';
        else if (sla.elapsedPercent >= 80) newLevel = 'L1';

        if (newLevel !== oldLevel) {
          ticket.escalation_level = newLevel;
          ticket.updated_at = new Date().toISOString();
          escalatedCount++;

          db.events.unshift({
            id: `event-esc-${Date.now()}-${ticket.id}`,
            ticket_id: ticket.id,
            actor: 'Escalation Watchdog',
            action: 'escalated',
            from_value: oldLevel,
            to_value: newLevel,
            note: `Auto-escalated to ${newLevel} (${Math.round(sla.elapsedPercent)}% of SLA window elapsed).`,
            created_at: ticket.updated_at,
          });

          const recipientRole =
            newLevel === 'L3' ? 'dept_head' : newLevel === 'L2' ? 'team_lead' : 'owner';
          db.notifications.unshift({
            id: `notif-esc-${Date.now()}-${ticket.id}`,
            ticket_id: ticket.id,
            recipient_role: recipientRole,
            recipient_name: 'Escalation Lead',
            channel: 'In-App Alert',
            level: newLevel,
            message: `Ticket ${ticket.ticket_number} escalated to ${newLevel}. Overdue by ${sla.timeRemainingStr}.`,
            is_read: false,
            created_at: ticket.updated_at,
          });
        }
      } else if (ticket.status === 'finalized' && !ticket.archived) {
        const resolvedTime = ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : 0;
        const sevenDaysMs = 7 * 24 * 3600 * 1000;
        if (now - resolvedTime > sevenDaysMs) {
          ticket.archived = true;
          ticket.updated_at = new Date().toISOString();
          archivedCount++;

          db.events.unshift({
            id: `event-arch-${Date.now()}-${ticket.id}`,
            ticket_id: ticket.id,
            actor: 'System Archival Engine',
            action: 'archived',
            from_value: 'finalized',
            to_value: 'archived',
            note: 'Ticket archived after 7 days in Finalized status.',
            created_at: ticket.updated_at,
          });
        }
      }
    }

    return { evaluatedCount: db.tickets.length, escalatedCount, archivedCount };
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const teamMembers = await this.getAllTeamMembers();
    const tickets = (await this.getTickets({ includeArchived: true })).map((t) =>
      enrichTicket(t, teamMembers)
    );

    const total = tickets.length;
    const open = tickets.filter((t) => t.status === 'open').length;
    const active = tickets.filter((t) => t.status === 'active').length;
    const finalized = tickets.filter((t) => t.status === 'finalized').length;
    const breached = countSLABreaches(tickets);
    const breachingSoon = tickets.filter(
      (t) => (t.status === 'open' || t.status === 'active') && t.sla_state === 'Breaching Soon'
    ).length;

    const slaCompliancePercent = calculateSLACompliance(tickets);

    let totalResponseHours = 0;
    let responseCount = 0;
    tickets.forEach((t) => {
      if (t.first_response_at) {
        const diffMs =
          new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime();
        totalResponseHours += Math.max(0, diffMs / (1000 * 60 * 60));
        responseCount++;
      }
    });

    let totalResolveHours = 0;
    let resolveCount = 0;
    tickets.forEach((t) => {
      if (t.resolved_at) {
        const diffMs = new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime();
        totalResolveHours += Math.max(0, diffMs / (1000 * 60 * 60));
        resolveCount++;
      }
    });

    const byDepartment = DEPARTMENT_CATEGORIES.map((dept) => {
      const deptTickets = tickets.filter((t) => t.category === dept);
      const openCount = deptTickets.filter((t) => t.status === 'open' || t.status === 'active').length;
      const breachedCount = deptTickets.filter(
        (t) => (t.status === 'open' || t.status === 'active') && t.sla_state === 'Breached'
      ).length;
      return {
        department: dept,
        name: dept,
        open: openCount,
        breached: breachedCount,
        count: deptTickets.length,
      };
    });

    const byChannel = SUPPORTED_CHANNELS.map((ch) => ({
      channel: ch,
      name: ch,
      count: tickets.filter((t) => t.channel === ch).length,
    }));

    const byPriority = (['P1', 'P2', 'P3', 'P4'] as TicketPriority[]).map((pri) => ({
      priority: pri,
      name: pri,
      count: tickets.filter((t) => t.priority === pri).length,
    }));

    const volumeMap = new Map<string, { created: number; resolved: number }>();
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(5, 10);
      volumeMap.set(dateStr, { created: 0, resolved: 0 });
    }

    tickets.forEach((t) => {
      const createdStr = t.created_at.slice(5, 10);
      if (volumeMap.has(createdStr)) {
        volumeMap.get(createdStr)!.created += 1;
      }
      if (t.resolved_at) {
        const resolvedStr = t.resolved_at.slice(5, 10);
        if (volumeMap.has(resolvedStr)) {
          volumeMap.get(resolvedStr)!.resolved += 1;
        }
      }
    });

    const volumeTrend = Array.from(volumeMap.entries()).map(([date, counts]) => ({
      date,
      submitted: counts.created,
      created: counts.created,
      resolved: counts.resolved,
    }));

    const complianceByDept = DEPARTMENT_CATEGORIES.map((dept) => {
      const deptFinalized = tickets.filter(
        (t) => t.category === dept && t.status === 'finalized'
      );
      if (deptFinalized.length === 0) {
        return {
          department: dept,
          compliancePercent: null,
          rate: null,
          resolvedCount: 0,
        };
      }
      const met = deptFinalized.filter(
        (t) =>
          t.resolved_at &&
          new Date(t.resolved_at).getTime() <= new Date(t.resolve_due_at).getTime()
      ).length;
      const pct = Math.round((met / deptFinalized.length) * 100);
      return {
        department: dept,
        compliancePercent: pct,
        rate: pct,
        resolvedCount: deptFinalized.length,
      };
    });

    const needsAttention = tickets
      .filter(
        (t) =>
          (t.status === 'open' || t.status === 'active') &&
          (t.sla_state === 'Breached' ||
            t.sla_state === 'Breaching Soon' ||
            t.priority === 'P1')
      )
      .slice(0, 10);

    return {
      kpis: {
        total,
        open,
        active,
        finalized,
        breached,
        breachingSoon,
        slaCompliancePercent,
        avgResponseHours:
          responseCount > 0 ? (totalResponseHours / responseCount).toFixed(1) : '0.0',
        avgResolveHours:
          resolveCount > 0 ? (totalResolveHours / resolveCount).toFixed(1) : '0.0',
      },
      byDepartment,
      byChannel,
      byPriority,
      volumeTrend,
      complianceByDept,
      needsAttention,
    };
  }

  async getTelegramLink(chatId: string): Promise<TelegramLink | null> {
    const db = getMemoryDb();
    const link = db.telegramLinks.find((l) => l.chat_id === chatId);
    return link || null;
  }

  async setTelegramLink(chatId: string, employeeEmail: string): Promise<TelegramLink> {
    const db = getMemoryDb();
    const existingIndex = db.telegramLinks.findIndex((l) => l.chat_id === chatId);
    const link: TelegramLink = {
      chat_id: chatId,
      employee_email: employeeEmail,
      created_at: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      db.telegramLinks[existingIndex] = link;
    } else {
      db.telegramLinks.push(link);
    }
    return link;
  }
}

// ==============================================================================
// Implementation 2: Supabase Postgres Repository (Production Source of Truth)
// ==============================================================================

class SupabaseRepo implements TicketRepository {
  private getClient() {
    const client = getSupabaseServerClient();
    if (!client) {
      throw new Error('Supabase client is not configured.');
    }
    return client;
  }

  async getAllEmployees(): Promise<Employee[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error) {
      throw new Error(`Failed to load employees from Supabase: ${error.message}`);
    }
    return data || [];
  }

  async getAllTeamMembers(): Promise<TeamMember[]> {
    const supabase = this.getClient();
    const { data: members, error: memError } = await supabase
      .from('team_members')
      .select('*')
      .order('name');
    if (memError) {
      throw new Error(`Failed to load team members from Supabase: ${memError.message}`);
    }

    // Compute live open tickets count from Supabase
    const { data: activeTickets, error: tickError } = await supabase
      .from('tickets')
      .select('assignee_id')
      .in('status', ['open', 'active']);

    if (tickError) {
      throw new Error(`Failed to calculate active tickets from Supabase: ${tickError.message}`);
    }

    const loadMap = new Map<string, number>();
    (activeTickets || []).forEach((t: { assignee_id: string | null }) => {
      if (t.assignee_id) {
        loadMap.set(t.assignee_id, (loadMap.get(t.assignee_id) || 0) + 1);
      }
    });

    return (members || []).map((m: TeamMember) => ({
      ...m,
      open_tickets_count: loadMap.get(m.id) || 0,
    }));
  }

  async getTickets(filters?: TicketFilters): Promise<Ticket[]> {
    const supabase = this.getClient();
    let query = supabase.from('tickets').select('*');

    if (!filters?.includeArchived) {
      query = query.eq('archived', false);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters?.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.channel && filters.channel !== 'all') {
      query = query.eq('channel', filters.channel);
    }
    if (filters?.assigneeId && filters.assigneeId !== 'all') {
      query = query.eq('assignee_id', filters.assigneeId);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      query = query.or(
        `subject.ilike.%${q}%,description.ilike.%${q}%,ticket_number.ilike.%${q}%,requester_name.ilike.%${q}%,requester_email.ilike.%${q}%`
      );
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load tickets from Supabase: ${error.message}`);
    }

    const teamMembers = await this.getAllTeamMembers();
    let enriched = (data || []).map((t: Ticket) => enrichTicket(t, teamMembers));

    if (filters?.slaState && filters.slaState !== 'all') {
      enriched = enriched.filter((t) => t.sla_state === filters.slaState);
    }

    return enriched;
  }

  async getTicketByNumber(ticketNumber: string, email?: string): Promise<Ticket | null> {
    const supabase = this.getClient();
    let query = supabase
      .from('tickets')
      .select('*')
      .eq('ticket_number', ticketNumber.toUpperCase());

    if (email) {
      query = query.ilike('requester_email', email.trim());
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`Failed to get ticket by number from Supabase: ${error.message}`);
    }
    if (!data) return null;

    const teamMembers = await this.getAllTeamMembers();
    return enrichTicket(data, teamMembers);
  }

  async getTicketById(idOrNumber: string): Promise<Ticket | null> {
    const supabase = this.getClient();
    const norm = idOrNumber.trim();
    const isTicketNumber = norm.toUpperCase().startsWith('REQ-');

    const query = isTicketNumber
      ? supabase.from('tickets').select('*').eq('ticket_number', norm.toUpperCase())
      : supabase.from('tickets').select('*').eq('id', norm);

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`Failed to get ticket by ID from Supabase: ${error.message}`);
    }
    if (!data) return null;

    const teamMembers = await this.getAllTeamMembers();
    return enrichTicket(data, teamMembers);
  }

  async getTicketEvents(ticketIdOrNumber: string): Promise<TicketEvent[]> {
    const supabase = this.getClient();
    const ticket = await this.getTicketById(ticketIdOrNumber);
    if (!ticket) return [];

    const { data, error } = await supabase
      .from('ticket_events')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load ticket events from Supabase: ${error.message}`);
    }
    return data || [];
  }

  async getNotifications(limit: number = 20): Promise<NotificationItem[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to load notifications from Supabase: ${error.message}`);
    }
    return data || [];
  }

  async createTicket(
    ticketData: Omit<
      Ticket,
      | 'id'
      | 'ticket_number'
      | 'created_at'
      | 'updated_at'
      | 'sla_state'
      | 'sla_elapsed_percent'
      | 'time_remaining_str'
      | 'assignee'
    >,
    actor: string = 'System Engine'
  ): Promise<Ticket> {
    const supabase = this.getClient();

    // Do NOT generate ticket_number or id here. Supabase triggers auto-generate REQ-YYYY-NNNN.
    const rowToInsert = sanitizeTicketForDb({
      requester_name: ticketData.requester_name,
      requester_email: ticketData.requester_email,
      requester_employee_id: ticketData.requester_employee_id || null,
      channel: ticketData.channel,
      subject: ticketData.subject,
      description: ticketData.description,
      category: ticketData.category,
      category_source: ticketData.category_source,
      category_confidence: ticketData.category_confidence,
      matched_keywords: ticketData.matched_keywords,
      priority: ticketData.priority,
      status: ticketData.status || 'open',
      assignee_id: ticketData.assignee_id || null,
      urgent_flag: ticketData.urgent_flag || false,
      response_due_at: ticketData.response_due_at,
      resolve_due_at: ticketData.resolve_due_at,
      first_response_at: ticketData.first_response_at || null,
      resolved_at: ticketData.resolved_at || null,
      resolution_note: ticketData.resolution_note || null,
      escalation_level: ticketData.escalation_level || 'L0',
      possible_duplicate_of: ticketData.possible_duplicate_of || null,
      archived: ticketData.archived || false,
    });

    // Strip id and ticket_number if present
    delete rowToInsert.id;
    delete rowToInsert.ticket_number;

    const { data: newTicket, error } = await supabase
      .from('tickets')
      .insert([rowToInsert])
      .select()
      .single();

    if (error || !newTicket) {
      throw new Error(`Failed to insert ticket in Supabase: ${error?.message}`);
    }

    // Write ticket_events (created)
    const { error: evError } = await supabase.from('ticket_events').insert([
      {
        ticket_id: newTicket.id,
        actor,
        action: 'created',
        from_value: null,
        to_value: 'open',
        note: `Ticket created via ${newTicket.channel}. Auto-categorised as ${newTicket.category} (${Math.round(newTicket.category_confidence * 100)}% confidence).`,
      },
    ]);
    if (evError) {
      console.error('Error logging creation event to Supabase:', evError);
    }

    // If assigned, log assignment event
    if (newTicket.assignee_id) {
      const teamMembers = await this.getAllTeamMembers();
      const assignee = teamMembers.find((m) => m.id === newTicket.assignee_id);
      await supabase.from('ticket_events').insert([
        {
          ticket_id: newTicket.id,
          actor: 'Smart Routing Engine',
          action: 'assigned',
          from_value: null,
          to_value: assignee ? assignee.name : newTicket.assignee_id,
          note: `Assigned based on least open tickets in ${newTicket.category}.`,
        },
      ]);
    }

    // If P1, trigger alert notification
    if (newTicket.priority === 'P1') {
      await supabase.from('notifications').insert([
        {
          ticket_id: newTicket.id,
          recipient_role: 'team_lead',
          recipient_name: 'Department Lead',
          channel: 'In-App Alert',
          level: 'P1_ALERT',
          message: `CRITICAL P1 TICKET: "${newTicket.subject}" requires immediate intervention.`,
          is_read: false,
        },
      ]);
    }

    const teamMembers = await this.getAllTeamMembers();
    return enrichTicket(newTicket, teamMembers);
  }

  async transitionTicketStatus(
    ticketIdOrNumber: string,
    newStatus: TicketStatus,
    options: { note?: string; assigneeId?: string; actor?: string }
  ): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
    const supabase = this.getClient();
    const ticket = await this.getTicketById(ticketIdOrNumber);
    if (!ticket) return { success: false, error: 'Ticket not found.' };

    const currentStatus = ticket.status;
    const nowIso = new Date().toISOString();
    const actor = options.actor || 'Staff Member';

    const updates: Record<string, any> = {
      updated_at: nowIso,
    };
    let eventAction = 'status_change';
    let eventFrom: string | null = currentStatus;
    let eventTo: string | null = newStatus;
    let eventNote: string | null = null;

    if (currentStatus === 'open' && newStatus === 'active') {
      const effectiveAssignee = options.assigneeId || ticket.assignee_id;
      if (!effectiveAssignee) {
        return { success: false, error: 'Transitioning to Active requires an assigned owner.' };
      }
      updates.status = 'active';
      updates.assignee_id = effectiveAssignee;
      if (!ticket.first_response_at) {
        updates.first_response_at = nowIso;
      }
      eventNote = options.note || 'Ticket accepted into active progress. First response recorded.';
    } else if (currentStatus === 'active' && newStatus === 'finalized') {
      if (!options.note || options.note.trim().length < 5) {
        return {
          success: false,
          error: 'Resolution note (at least 5 characters) is required to finalize.',
        };
      }
      updates.status = 'finalized';
      updates.resolved_at = nowIso;
      updates.resolution_note = options.note.trim();
      eventNote = `Finalized with resolution note: "${updates.resolution_note}"`;
    } else if (currentStatus === 'finalized' && newStatus === 'active') {
      const resolvedTime = ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : 0;
      const sevenDaysMs = 7 * 24 * 3600 * 1000;
      if (Date.now() - resolvedTime > sevenDaysMs || ticket.archived) {
        return {
          success: false,
          error: 'Tickets finalized more than 7 days ago cannot be reopened (Archived).',
        };
      }
      if (!options.note || options.note.trim().length < 5) {
        return {
          success: false,
          error: 'A justification note is required to reopen this finalized ticket.',
        };
      }
      updates.status = 'active';
      updates.resolved_at = null;
      eventAction = 'reopened';
      eventNote = `Ticket reopened: "${options.note.trim()}"`;
    } else {
      return {
        success: false,
        error: `Invalid state jump from ${currentStatus} to ${newStatus}.`,
      };
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from('tickets')
      .update(sanitizeTicketForDb(updates))
      .eq('id', ticket.id)
      .select()
      .single();

    if (updateError || !updatedRow) {
      throw new Error(`Failed to update ticket status in Supabase: ${updateError?.message}`);
    }

    // Write audit event
    await supabase.from('ticket_events').insert([
      {
        ticket_id: ticket.id,
        actor,
        action: eventAction,
        from_value: eventFrom,
        to_value: eventTo,
        note: eventNote,
      },
    ]);

    const teamMembers = await this.getAllTeamMembers();
    return { success: true, ticket: enrichTicket(updatedRow, teamMembers) };
  }

  async reassignTicket(
    ticketIdOrNumber: string,
    newAssigneeId: string | null,
    actor: string = 'Staff Member'
  ): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
    const supabase = this.getClient();
    const ticket = await this.getTicketById(ticketIdOrNumber);
    if (!ticket) return { success: false, error: 'Ticket not found.' };

    const teamMembers = await this.getAllTeamMembers();
    const oldAssignee = teamMembers.find((m) => m.id === ticket.assignee_id);
    const newAssignee = teamMembers.find((m) => m.id === newAssigneeId);

    const nowIso = new Date().toISOString();
    const { data: updatedRow, error: updateError } = await supabase
      .from('tickets')
      .update({
        assignee_id: newAssigneeId,
        updated_at: nowIso,
      })
      .eq('id', ticket.id)
      .select()
      .single();

    if (updateError || !updatedRow) {
      throw new Error(`Failed to reassign ticket in Supabase: ${updateError?.message}`);
    }

    await supabase.from('ticket_events').insert([
      {
        ticket_id: ticket.id,
        actor,
        action: 'reassigned',
        from_value: oldAssignee ? oldAssignee.name : 'Unassigned',
        to_value: newAssignee ? newAssignee.name : 'Unassigned',
        note: `Reassigned from ${oldAssignee ? oldAssignee.name : 'Unassigned'} to ${newAssignee ? newAssignee.name : 'Unassigned'}`,
      },
    ]);

    return { success: true, ticket: enrichTicket(updatedRow, teamMembers) };
  }

  async overrideTicket(
    ticketIdOrNumber: string,
    updates: {
      category?: DepartmentCategory;
      priority?: TicketPriority;
      reason: string;
      actor?: string;
    }
  ): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
    const supabase = this.getClient();
    const ticket = await this.getTicketById(ticketIdOrNumber);
    if (!ticket) return { success: false, error: 'Ticket not found.' };

    const actor = updates.actor || 'Staff Member';
    const nowIso = new Date().toISOString();
    const dbUpdates: Record<string, any> = { updated_at: nowIso };

    if (updates.category && updates.category !== ticket.category) {
      dbUpdates.category = updates.category;
      dbUpdates.category_source = 'manual';

      await supabase.from('ticket_events').insert([
        {
          ticket_id: ticket.id,
          actor,
          action: 'category_override',
          from_value: ticket.category,
          to_value: updates.category,
          note: `Category manually modified: ${updates.reason}`,
        },
      ]);
    }

    if (updates.priority && updates.priority !== ticket.priority) {
      dbUpdates.priority = updates.priority;

      await supabase.from('ticket_events').insert([
        {
          ticket_id: ticket.id,
          actor,
          action: 'priority_override',
          from_value: ticket.priority,
          to_value: updates.priority,
          note: `Priority manually modified: ${updates.reason}`,
        },
      ]);
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from('tickets')
      .update(sanitizeTicketForDb(dbUpdates))
      .eq('id', ticket.id)
      .select()
      .single();

    if (updateError || !updatedRow) {
      throw new Error(`Failed to override ticket in Supabase: ${updateError?.message}`);
    }

    const teamMembers = await this.getAllTeamMembers();
    return { success: true, ticket: enrichTicket(updatedRow, teamMembers) };
  }

  async addInternalNote(
    ticketIdOrNumber: string,
    note: string,
    actor: string = 'Staff Member'
  ): Promise<{ success: boolean; event?: TicketEvent; error?: string }> {
    const supabase = this.getClient();
    const ticket = await this.getTicketById(ticketIdOrNumber);
    if (!ticket) return { success: false, error: 'Ticket not found.' };

    const { data: event, error } = await supabase
      .from('ticket_events')
      .insert([
        {
          ticket_id: ticket.id,
          actor,
          action: 'note_added',
          note: note.trim(),
        },
      ])
      .select()
      .single();

    if (error || !event) {
      throw new Error(`Failed to add internal note to Supabase: ${error?.message}`);
    }

    return { success: true, event };
  }

  async runEscalationWatchdog(): Promise<{
    evaluatedCount: number;
    escalatedCount: number;
    archivedCount: number;
  }> {
    const supabase = this.getClient();
    const now = Date.now();
    let escalatedCount = 0;
    let archivedCount = 0;

    // 1. Evaluate open and active tickets for SLA escalation
    const { data: activeTickets, error: actError } = await supabase
      .from('tickets')
      .select('*')
      .in('status', ['open', 'active'])
      .eq('archived', false);

    if (actError) {
      throw new Error(`Watchdog error querying active tickets: ${actError.message}`);
    }

    for (const ticket of activeTickets || []) {
      const sla = evaluateSLAState(ticket.created_at, ticket.resolve_due_at, ticket.resolved_at, ticket.status);
      const oldLevel = ticket.escalation_level;
      let newLevel: EscalationLevel = 'L0';

      if (sla.elapsedPercent >= 150) newLevel = 'L3';
      else if (sla.elapsedPercent >= 100) newLevel = 'L2';
      else if (sla.elapsedPercent >= 80) newLevel = 'L1';

      if (newLevel !== oldLevel) {
        const nowIso = new Date().toISOString();
        await supabase
          .from('tickets')
          .update({ escalation_level: newLevel, updated_at: nowIso })
          .eq('id', ticket.id);

        escalatedCount++;

        await supabase.from('ticket_events').insert([
          {
            ticket_id: ticket.id,
            actor: 'Escalation Watchdog',
            action: 'escalated',
            from_value: oldLevel,
            to_value: newLevel,
            note: `Auto-escalated to ${newLevel} (${Math.round(sla.elapsedPercent)}% of SLA window elapsed).`,
          },
        ]);

        const recipientRole =
          newLevel === 'L3' ? 'dept_head' : newLevel === 'L2' ? 'team_lead' : 'owner';
        await supabase.from('notifications').insert([
          {
            ticket_id: ticket.id,
            recipient_role: recipientRole,
            recipient_name: 'Escalation Lead',
            channel: 'In-App Alert',
            level: newLevel,
            message: `Ticket ${ticket.ticket_number} escalated to ${newLevel}. Overdue by ${sla.timeRemainingStr}.`,
            is_read: false,
          },
        ]);
      }
    }

    // 2. Evaluate finalized tickets for 7-day archival
    const { data: finalizedTickets, error: finError } = await supabase
      .from('tickets')
      .select('*')
      .eq('status', 'finalized')
      .eq('archived', false);

    if (!finError && finalizedTickets) {
      const sevenDaysMs = 7 * 24 * 3600 * 1000;
      for (const ticket of finalizedTickets) {
        const resolvedTime = ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : 0;
        if (now - resolvedTime > sevenDaysMs) {
          const nowIso = new Date().toISOString();
          await supabase
            .from('tickets')
            .update({ archived: true, updated_at: nowIso })
            .eq('id', ticket.id);

          archivedCount++;

          await supabase.from('ticket_events').insert([
            {
              ticket_id: ticket.id,
              actor: 'System Archival Engine',
              action: 'archived',
              from_value: 'finalized',
              to_value: 'archived',
              note: 'Ticket archived after 7 days in Finalized status.',
            },
          ]);
        }
      }
    }

    return {
      evaluatedCount: (activeTickets || []).length,
      escalatedCount,
      archivedCount,
    };
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const supabase = this.getClient();
    const { data: allTickets, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to calculate dashboard metrics from Supabase: ${error.message}`);
    }

    const teamMembers = await this.getAllTeamMembers();
    const tickets = (allTickets || []).map((t: Ticket) => enrichTicket(t, teamMembers));

    const total = tickets.length;
    const open = tickets.filter((t) => t.status === 'open').length;
    const active = tickets.filter((t) => t.status === 'active').length;
    const finalized = tickets.filter((t) => t.status === 'finalized').length;
    const breached = countSLABreaches(tickets);
    const breachingSoon = tickets.filter(
      (t) => (t.status === 'open' || t.status === 'active') && t.sla_state === 'Breaching Soon'
    ).length;

    const slaCompliancePercent = calculateSLACompliance(tickets);

    let totalResponseHours = 0;
    let responseCount = 0;
    tickets.forEach((t) => {
      if (t.first_response_at) {
        const diffMs =
          new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime();
        totalResponseHours += Math.max(0, diffMs / (1000 * 60 * 60));
        responseCount++;
      }
    });

    let totalResolveHours = 0;
    let resolveCount = 0;
    tickets.forEach((t) => {
      if (t.resolved_at) {
        const diffMs = new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime();
        totalResolveHours += Math.max(0, diffMs / (1000 * 60 * 60));
        resolveCount++;
      }
    });

    const byDepartment = DEPARTMENT_CATEGORIES.map((dept) => {
      const deptTickets = tickets.filter((t) => t.category === dept);
      const openCount = deptTickets.filter((t) => t.status === 'open' || t.status === 'active').length;
      const breachedCount = deptTickets.filter(
        (t) => (t.status === 'open' || t.status === 'active') && t.sla_state === 'Breached'
      ).length;
      return {
        department: dept,
        name: dept,
        open: openCount,
        breached: breachedCount,
        count: deptTickets.length,
      };
    });

    const byChannel = SUPPORTED_CHANNELS.map((ch) => ({
      channel: ch,
      name: ch,
      count: tickets.filter((t) => t.channel === ch).length,
    }));

    const byPriority = (['P1', 'P2', 'P3', 'P4'] as TicketPriority[]).map((pri) => ({
      priority: pri,
      name: pri,
      count: tickets.filter((t) => t.priority === pri).length,
    }));

    const volumeMap = new Map<string, { created: number; resolved: number }>();
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(5, 10);
      volumeMap.set(dateStr, { created: 0, resolved: 0 });
    }

    tickets.forEach((t) => {
      const createdStr = t.created_at.slice(5, 10);
      if (volumeMap.has(createdStr)) {
        volumeMap.get(createdStr)!.created += 1;
      }
      if (t.resolved_at) {
        const resolvedStr = t.resolved_at.slice(5, 10);
        if (volumeMap.has(resolvedStr)) {
          volumeMap.get(resolvedStr)!.resolved += 1;
        }
      }
    });

    const volumeTrend = Array.from(volumeMap.entries()).map(([date, counts]) => ({
      date,
      submitted: counts.created,
      created: counts.created,
      resolved: counts.resolved,
    }));

    const complianceByDept = DEPARTMENT_CATEGORIES.map((dept) => {
      const deptFinalized = tickets.filter(
        (t) => t.category === dept && t.status === 'finalized'
      );
      if (deptFinalized.length === 0) {
        return {
          department: dept,
          compliancePercent: null,
          rate: null,
          resolvedCount: 0,
        };
      }
      const met = deptFinalized.filter(
        (t) =>
          t.resolved_at &&
          new Date(t.resolved_at).getTime() <= new Date(t.resolve_due_at).getTime()
      ).length;
      const pct = Math.round((met / deptFinalized.length) * 100);
      return {
        department: dept,
        compliancePercent: pct,
        rate: pct,
        resolvedCount: deptFinalized.length,
      };
    });

    const needsAttention = tickets
      .filter(
        (t) =>
          (t.status === 'open' || t.status === 'active') &&
          (t.sla_state === 'Breached' ||
            t.sla_state === 'Breaching Soon' ||
            t.priority === 'P1')
      )
      .slice(0, 10);

    return {
      kpis: {
        total,
        open,
        active,
        finalized,
        breached,
        breachingSoon,
        slaCompliancePercent,
        avgResponseHours:
          responseCount > 0 ? (totalResponseHours / responseCount).toFixed(1) : '0.0',
        avgResolveHours:
          resolveCount > 0 ? (totalResolveHours / resolveCount).toFixed(1) : '0.0',
      },
      byDepartment,
      byChannel,
      byPriority,
      volumeTrend,
      complianceByDept,
      needsAttention,
    };
  }

  async getTelegramLink(chatId: string): Promise<TelegramLink | null> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('telegram_links')
      .select('*')
      .eq('chat_id', chatId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get telegram link from Supabase: ${error.message}`);
    }
    return data || null;
  }

  async setTelegramLink(chatId: string, employeeEmail: string): Promise<TelegramLink> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('telegram_links')
      .upsert({
        chat_id: chatId,
        employee_email: employeeEmail,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save telegram link to Supabase: ${error?.message}`);
    }
    return data;
  }
}

// Single instance creation
const memoryRepo = new MemoryRepo();
const supabaseRepo = new SupabaseRepo();

/**
 * Returns the active repository: Supabase when configured, Memory store otherwise.
 */
function getRepository(): TicketRepository {
  if (isSupabaseConfigured()) {
    return supabaseRepo;
  }
  return memoryRepo;
}

// ==============================================================================
// Exported Repository Delegators
// ==============================================================================

export async function getAllEmployees(): Promise<Employee[]> {
  return getRepository().getAllEmployees();
}

export async function getAllTeamMembers(): Promise<TeamMember[]> {
  return getRepository().getAllTeamMembers();
}

export async function getTickets(filters?: TicketFilters): Promise<Ticket[]> {
  return getRepository().getTickets(filters);
}

export async function getTicketByNumber(
  ticketNumber: string,
  email?: string
): Promise<Ticket | null> {
  return getRepository().getTicketByNumber(ticketNumber, email);
}

export async function getTicketById(idOrNumber: string): Promise<Ticket | null> {
  return getRepository().getTicketById(idOrNumber);
}

export async function getTicketEvents(ticketIdOrNumber: string): Promise<TicketEvent[]> {
  return getRepository().getTicketEvents(ticketIdOrNumber);
}

export async function getNotifications(limit?: number): Promise<NotificationItem[]> {
  return getRepository().getNotifications(limit);
}

export async function createTicket(
  ticketData: Omit<
    Ticket,
    | 'id'
    | 'ticket_number'
    | 'created_at'
    | 'updated_at'
    | 'sla_state'
    | 'sla_elapsed_percent'
    | 'time_remaining_str'
    | 'assignee'
  >,
  actor?: string
): Promise<Ticket> {
  return getRepository().createTicket(ticketData, actor);
}

export async function transitionTicketStatus(
  ticketIdOrNumber: string,
  newStatus: TicketStatus,
  options: { note?: string; assigneeId?: string; actor?: string }
): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
  return getRepository().transitionTicketStatus(ticketIdOrNumber, newStatus, options);
}

export async function reassignTicket(
  ticketIdOrNumber: string,
  newAssigneeId: string | null,
  actor?: string
): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
  return getRepository().reassignTicket(ticketIdOrNumber, newAssigneeId, actor);
}

export async function overrideTicket(
  ticketIdOrNumber: string,
  updates: {
    category?: DepartmentCategory;
    priority?: TicketPriority;
    reason: string;
    actor?: string;
  }
): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
  return getRepository().overrideTicket(ticketIdOrNumber, updates);
}

export async function addInternalNote(
  ticketIdOrNumber: string,
  note: string,
  actor?: string
): Promise<{ success: boolean; event?: TicketEvent; error?: string }> {
  return getRepository().addInternalNote(ticketIdOrNumber, note, actor);
}

export async function runEscalationWatchdog(): Promise<{
  evaluatedCount: number;
  escalatedCount: number;
  archivedCount: number;
}> {
  return getRepository().runEscalationWatchdog();
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return getRepository().getDashboardMetrics();
}

export async function getTelegramLink(chatId: string): Promise<TelegramLink | null> {
  return getRepository().getTelegramLink(chatId);
}

export async function setTelegramLink(
  chatId: string,
  employeeEmail: string
): Promise<TelegramLink> {
  return getRepository().setTelegramLink(chatId, employeeEmail);
}
