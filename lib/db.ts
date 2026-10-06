// ==============================================================================
// Physique 57 · People Desk
// Unified Data Store & Repository Layer
// Supports Supabase Postgres with automatic in-memory fallback for instant demo
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
} from './config';
import {
  Employee,
  TeamMember,
  Ticket,
  TicketEvent,
  NotificationItem,
} from './types';
import { evaluateSLAState } from './sla';

// In-Memory Global Store (survives requests in Node process memory)
interface MemoryDatabase {
  employees: Employee[];
  teamMembers: TeamMember[];
  tickets: Ticket[];
  events: TicketEvent[];
  notifications: NotificationItem[];
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
      nextTicketSeq: 15,
    };
  }
  return global.__P57_DB;
}

/**
 * Generates sequential ticket numbers like REQ-2026-0015
 */
function generateNextTicketNumber(): string {
  const db = getMemoryDb();
  const year = new Date().getFullYear();
  const num = String(db.nextTicketSeq++).padStart(4, '0');
  return `REQ-${year}-${num}`;
}

/**
 * Enriches ticket with live SLA state and assignee details
 */
export function enrichTicket(ticket: Ticket, teamMembers: TeamMember[]): Ticket {
  const assignee = teamMembers.find((m) => m.id === ticket.assignee_id) || null;
  const sla = evaluateSLAState(ticket.created_at, ticket.resolve_due_at, ticket.resolved_at);

  return {
    ...ticket,
    assignee,
    sla_state: sla.slaState,
    sla_elapsed_percent: sla.elapsedPercent,
    time_remaining_str: sla.timeRemainingStr,
  };
}

// ------------------------------------------------------------------------------
// Data Access Methods
// ------------------------------------------------------------------------------

export async function getAllEmployees(): Promise<Employee[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('employees').select('*').order('name');
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase query failed, falling back to local memory store', e);
    }
  }
  return getMemoryDb().employees;
}

export async function getAllTeamMembers(): Promise<TeamMember[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('team_members').select('*').order('name');
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase query failed, falling back to local memory store', e);
    }
  }
  return getMemoryDb().teamMembers;
}

export async function getTickets(filters?: {
  status?: string;
  category?: string;
  priority?: string;
  channel?: string;
  assignee_id?: string;
  search?: string;
  includeArchived?: boolean;
  slaState?: string;
}): Promise<Ticket[]> {
  const db = getMemoryDb();
  let tickets = [...db.tickets];
  const members = db.teamMembers;

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        tickets = data;
      }
    } catch (e) {
      console.warn('Supabase tickets query failed, using memory store', e);
    }
  }

  // Filter archived by default unless toggled
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

  if (filters?.assignee_id && filters.assignee_id !== 'all') {
    if (filters.assignee_id === 'unassigned') {
      tickets = tickets.filter((t) => !t.assignee_id);
    } else {
      tickets = tickets.filter((t) => t.assignee_id === filters.assignee_id);
    }
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    tickets = tickets.filter(
      (t) =>
        t.ticket_number.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.requester_name.toLowerCase().includes(q) ||
        t.requester_email.toLowerCase().includes(q)
    );
  }

  // Enrich with live SLA
  let enriched = tickets.map((t) => enrichTicket(t, members));

  if (filters?.slaState && filters.slaState !== 'all') {
    enriched = enriched.filter((t) => t.sla_state === filters.slaState);
  }

  return enriched;
}

export async function getTicketByNumber(
  ticketNumber: string,
  email?: string
): Promise<Ticket | null> {
  const db = getMemoryDb();
  let ticket = db.tickets.find((t) => t.ticket_number.toUpperCase() === ticketNumber.toUpperCase());

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      let query = supabase.from('tickets').select('*').eq('ticket_number', ticketNumber.toUpperCase());
      if (email) {
        query = query.ilike('requester_email', email.trim());
      }
      const { data, error } = await query.single();
      if (!error && data) {
        ticket = data;
      }
    } catch (e) {
      console.warn('Supabase query failed for ticket number', e);
    }
  }

  if (!ticket) return null;

  if (email && ticket.requester_email.toLowerCase().trim() !== email.toLowerCase().trim()) {
    return null;
  }

  return enrichTicket(ticket, db.teamMembers);
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const db = getMemoryDb();
  const normalizedId = id.trim();
  let ticket = db.tickets.find(
    (t) => t.id === normalizedId || t.ticket_number.toUpperCase() === normalizedId.toUpperCase()
  );

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const isTicketNumber = normalizedId.toUpperCase().startsWith('REQ-');
      const query = isTicketNumber
        ? supabase.from('tickets').select('*').eq('ticket_number', normalizedId.toUpperCase())
        : supabase.from('tickets').select('*').eq('id', normalizedId);
      const { data, error } = await query.single();
      if (!error && data) {
        ticket = data;
      }
    } catch (e) {
      console.warn('Supabase query failed for ticket id', e);
    }
  }

  if (!ticket) return null;
  return enrichTicket(ticket, db.teamMembers);
}

export async function getTicketEvents(ticketId: string): Promise<TicketEvent[]> {
  const db = getMemoryDb();
  // Resolve actual ticket UUID if ticket_number was passed
  const resolvedTicket = db.tickets.find(
    (t) => t.id === ticketId || t.ticket_number.toUpperCase() === ticketId.toUpperCase()
  );
  const actualId = resolvedTicket?.id || ticketId;

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('ticket_events')
        .select('*')
        .eq('ticket_id', actualId)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase ticket events query failed', e);
    }
  }

  return db.events
    .filter((e) => e.ticket_id === actualId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getNotifications(limit: number = 20): Promise<NotificationItem[]> {
  const db = getMemoryDb();
  const supabase = getSupabaseServerClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase notifications query failed', e);
    }
  }

  return db.notifications
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

/**
 * Creates a ticket, writes the initial audit event, and notifies on P1
 */
export async function createTicket(
  ticketData: Omit<Ticket, 'id' | 'ticket_number' | 'created_at' | 'updated_at'>,
  actor: string = 'System Engine'
): Promise<Ticket> {
  const db = getMemoryDb();
  const ticketNumber = generateNextTicketNumber();
  const nowIso = new Date().toISOString();
  const id = `33333333-3333-3333-3333-${String(Date.now()).slice(-12)}`;

  const newTicket: Ticket = {
    ...ticketData,
    id,
    ticket_number: ticketNumber,
    created_at: nowIso,
    updated_at: nowIso,
  };

  db.tickets.unshift(newTicket);

  // Write audit event
  const event: TicketEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ticket_id: id,
    actor,
    action: 'created',
    from_value: null,
    to_value: 'open',
    note: `Ticket created via ${newTicket.channel}. Auto-categorised as ${newTicket.category} (${Math.round(newTicket.category_confidence * 100)}% confidence).`,
    created_at: nowIso,
  };
  db.events.unshift(event);

  // If assigned, write assignment event
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

  // If P1, trigger immediate notification
  if (newTicket.priority === 'P1') {
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      ticket_id: id,
      recipient_role: 'team_lead',
      recipient_name: 'Department Lead',
      channel: 'In-App Alert',
      level: 'P1_ALERT',
      message: `CRITICAL ALERT: New P1 ticket ${ticketNumber} (${newTicket.subject}) submitted. Response SLA: 1 Hour.`,
      is_read: false,
      created_at: nowIso,
    });
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from('tickets').insert([newTicket]);
      await supabase.from('ticket_events').insert([event]);
    } catch (e) {
      console.warn('Supabase ticket insertion error', e);
    }
  }

  return enrichTicket(newTicket, db.teamMembers);
}

/**
 * State Machine Transition:
 * Open -> Active (requires an owner; records first-response time)
 * Active -> Finalized (requires a resolution note)
 * Finalized -> Active (reopening within 7 days with reason)
 */
export async function transitionTicketStatus(
  ticketId: string,
  newStatus: TicketStatus,
  options: {
    note?: string;
    assigneeId?: string;
    actor?: string;
  }
): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
  const db = getMemoryDb();
  const ticket = db.tickets.find(
    (t) => t.id === ticketId || t.ticket_number.toUpperCase() === ticketId.toUpperCase()
  );
  if (!ticket) return { success: false, error: 'Ticket not found.' };

  const currentStatus = ticket.status;
  const nowIso = new Date().toISOString();
  const actor = options.actor || 'Staff Member';

  // Rule: Open -> Active requires an owner
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
  }
  // Rule: Active -> Finalized requires a resolution note
  else if (currentStatus === 'active' && newStatus === 'finalized') {
    if (!options.note || options.note.trim().length < 5) {
      return { success: false, error: 'Resolution note (at least 5 characters) is required to finalize.' };
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
  }
  // Rule: Finalized -> Active (reopening within 7 days)
  else if (currentStatus === 'finalized' && newStatus === 'active') {
    const resolvedTime = ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : 0;
    const sevenDaysMs = 7 * 24 * 3600 * 1000;
    if (Date.now() - resolvedTime > sevenDaysMs || ticket.archived) {
      return { success: false, error: 'Tickets finalized more than 7 days ago cannot be reopened (Archived).' };
    }
    if (!options.note || options.note.trim().length < 5) {
      return { success: false, error: 'A justification note is required to reopen this finalized ticket.' };
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

  // Update Supabase if configured
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase
        .from('tickets')
        .update({
          status: ticket.status,
          assignee_id: ticket.assignee_id,
          first_response_at: ticket.first_response_at,
          resolved_at: ticket.resolved_at,
          resolution_note: ticket.resolution_note,
          updated_at: ticket.updated_at,
        })
        .eq('id', ticket.id);
    } catch (e) {
      console.warn('Supabase update ticket status error', e);
    }
  }

  return { success: true, ticket: enrichTicket(ticket, db.teamMembers) };
}

/**
 * Reassigns ticket to another team member
 */
export async function reassignTicket(
  ticketId: string,
  newAssigneeId: string | null,
  actor: string = 'Staff Member'
): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
  const db = getMemoryDb();
  const ticket = db.tickets.find(
    (t) => t.id === ticketId || t.ticket_number.toUpperCase() === ticketId.toUpperCase()
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

  return { success: true, ticket: enrichTicket(ticket, db.teamMembers) };
}

/**
 * Manual override for Category and/or Priority
 */
export async function overrideTicket(
  ticketId: string,
  updates: {
    category?: DepartmentCategory;
    priority?: TicketPriority;
    reason: string;
    actor?: string;
  }
): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
  const db = getMemoryDb();
  const ticket = db.tickets.find(
    (t) => t.id === ticketId || t.ticket_number.toUpperCase() === ticketId.toUpperCase()
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
  return { success: true, ticket: enrichTicket(ticket, db.teamMembers) };
}

/**
 * Adds an internal investigation note
 */
export async function addInternalNote(
  ticketId: string,
  note: string,
  actor: string = 'Staff Member'
): Promise<{ success: boolean; event?: TicketEvent; error?: string }> {
  const db = getMemoryDb();
  const ticket = db.tickets.find(
    (t) => t.id === ticketId || t.ticket_number.toUpperCase() === ticketId.toUpperCase()
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

/**
 * Escalation Watchdog: Evaluates all open/active tickets, updates escalation level (L0-L3),
 * writes events when levels change, and creates simulated alert notifications.
 * Runs on admin load and via /api/cron/escalate.
 */
export async function runEscalationWatchdog(): Promise<{
  evaluatedCount: number;
  escalatedCount: number;
  archivedCount: number;
}> {
  const db = getMemoryDb();
  const now = Date.now();
  let escalatedCount = 0;
  let archivedCount = 0;

  for (const ticket of db.tickets) {
    // 1. Auto-archive check (finalized > 7 days)
    if (ticket.status === 'finalized' && !ticket.archived && ticket.resolved_at) {
      const resolvedAtMs = new Date(ticket.resolved_at).getTime();
      if (now - resolvedAtMs > 7 * 24 * 3600 * 1000) {
        ticket.archived = true;
        archivedCount++;
        db.events.unshift({
          id: `event-archive-${Date.now()}-${ticket.id.slice(0, 4)}`,
          ticket_id: ticket.id,
          actor: 'System Policy Engine',
          action: 'archived',
          note: 'Ticket automatically archived after 7 days in Finalized state.',
          created_at: new Date().toISOString(),
        });
      }
    }

    // 2. Escalation check for open/active tickets
    if (ticket.status === 'open' || ticket.status === 'active') {
      const sla = evaluateSLAState(ticket.created_at, ticket.resolve_due_at);
      const newLevel = sla.escalationLevel;

      if (newLevel !== ticket.escalation_level) {
        const oldLevel = ticket.escalation_level;
        ticket.escalation_level = newLevel;
        escalatedCount++;

        db.events.unshift({
          id: `event-esc-${Date.now()}-${ticket.id.slice(0, 4)}`,
          ticket_id: ticket.id,
          actor: 'SLA Watchdog',
          action: 'escalated',
          from_value: oldLevel,
          to_value: newLevel,
          note: `SLA target elapsed: ${sla.elapsedPercent}%. Level raised to ${newLevel}.`,
          created_at: new Date().toISOString(),
        });

        // Trigger simulated notification
        const recipientRole = newLevel === 'L3' ? 'dept_head' : newLevel === 'L2' ? 'team_lead' : 'owner';
        db.notifications.unshift({
          id: `notif-esc-${Date.now()}-${ticket.id.slice(0, 4)}`,
          ticket_id: ticket.id,
          recipient_role: recipientRole,
          recipient_name: recipientRole === 'dept_head' ? 'Department Head' : recipientRole === 'team_lead' ? 'Team Lead' : 'Ticket Assignee',
          channel: newLevel === 'L3' ? 'Slack (Simulated)' : 'In-App Alert',
          level: newLevel,
          message: `Escalation ${newLevel}: Ticket ${ticket.ticket_number} (${ticket.subject}) has reached ${sla.elapsedPercent}% SLA window.`,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  return {
    evaluatedCount: db.tickets.length,
    escalatedCount,
    archivedCount,
  };
}

/**
 * Computes live operational metrics for the Dashboard
 */
export async function getDashboardMetrics() {
  const db = getMemoryDb();
  const tickets = db.tickets.map((t) => enrichTicket(t, db.teamMembers));

  const openTickets = tickets.filter((t) => t.status === 'open');
  const activeTickets = tickets.filter((t) => t.status === 'active');
  const finalizedTickets = tickets.filter((t) => t.status === 'finalized');

  // SLA Breaches
  const breachedTickets = tickets.filter((t) => t.sla_state === 'Breached');
  const breachingSoonTickets = tickets.filter(
    (t) => t.sla_state === 'Breaching Soon' && (t.status === 'open' || t.status === 'active')
  );

  // SLA Resolution compliance %
  const finalizedCount = finalizedTickets.length;
  const resolvedWithinSLA = finalizedTickets.filter(
    (t) => t.resolved_at && new Date(t.resolved_at) <= new Date(t.resolve_due_at)
  ).length;
  const slaCompliancePercent = finalizedCount > 0 ? Math.round((resolvedWithinSLA / finalizedCount) * 100) : 100;

  // Average First Response Time (hours)
  const respondedTickets = tickets.filter((t) => t.first_response_at);
  let totalResponseHours = 0;
  respondedTickets.forEach((t) => {
    const diff = new Date(t.first_response_at!).getTime() - new Date(t.created_at).getTime();
    totalResponseHours += diff / (1000 * 3600);
  });
  const avgResponseHours = respondedTickets.length > 0 ? (totalResponseHours / respondedTickets.length).toFixed(1) : '1.4';

  // Average Resolution Time (hours)
  let totalResolveHours = 0;
  finalizedTickets.forEach((t) => {
    const diff = new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime();
    totalResolveHours += diff / (1000 * 3600);
  });
  const avgResolveHours = finalizedTickets.length > 0 ? (totalResolveHours / finalizedTickets.length).toFixed(1) : '18.2';

  // Chart Breakdown by Department
  const depts: DepartmentCategory[] = ['HR', 'IT', 'Payroll', 'Operations', 'Other'];
  const byDepartment = depts.map((d) => {
    const deptTickets = tickets.filter((t) => t.category === d);
    const openCount = deptTickets.filter((t) => t.status === 'open' || t.status === 'active').length;
    const breached = deptTickets.filter((t) => t.sla_state === 'Breached').length;
    return {
      department: d,
      total: deptTickets.length,
      open: openCount,
      breached,
    };
  });

  // Chart Breakdown by Channel
  const channels: TicketChannel[] = [
    'Web Form',
    'Email',
    'WhatsApp',
    'SMS',
    'Instagram DM',
    'Intercom Chat',
  ];
  const byChannel = channels.map((c) => ({
    channel: c,
    count: tickets.filter((t) => t.channel === c).length,
  }));

  // Chart Breakdown by Priority
  const priorities: TicketPriority[] = ['P1', 'P2', 'P3', 'P4'];
  const byPriority = priorities.map((p) => ({
    priority: p,
    count: tickets.filter((t) => t.priority === p).length,
  }));

  // 14-Day Volume Trend
  const trendDays = 14;
  const now = new Date();
  const volumeTrend = Array.from({ length: trendDays }).map((_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (trendDays - 1 - i));
    const dayStr = date.toISOString().split('T')[0];
    const displayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const createdOnDay = tickets.filter((t) => t.created_at.startsWith(dayStr)).length;
    const resolvedOnDay = tickets.filter((t) => t.resolved_at && t.resolved_at.startsWith(dayStr)).length;

    return {
      date: displayLabel,
      submitted: createdOnDay,
      resolved: resolvedOnDay,
    };
  });

  // SLA Compliance by Department
  const complianceByDept = depts.map((d) => {
    const deptFinalized = finalizedTickets.filter((t) => t.category === d);
    const passed = deptFinalized.filter((t) => t.resolved_at && new Date(t.resolved_at) <= new Date(t.resolve_due_at)).length;
    const percent = deptFinalized.length > 0 ? Math.round((passed / deptFinalized.length) * 100) : 100;
    return {
      department: d,
      compliancePercent: percent,
      resolvedCount: deptFinalized.length,
    };
  });

  // Needs Attention List (Breached + Breaching Soon)
  const needsAttention = tickets
    .filter((t) => (t.status === 'open' || t.status === 'active') && (t.sla_state === 'Breached' || t.sla_state === 'Breaching Soon'))
    .sort((a, b) => new Date(a.resolve_due_at).getTime() - new Date(b.resolve_due_at).getTime());

  return {
    kpis: {
      total: tickets.length,
      open: openTickets.length,
      active: activeTickets.length,
      finalized: finalizedTickets.length,
      breached: breachedTickets.length,
      breachingSoon: breachingSoonTickets.length,
      slaCompliancePercent,
      avgResponseHours,
      avgResolveHours,
    },
    byDepartment,
    byChannel,
    byPriority,
    volumeTrend,
    complianceByDept,
    needsAttention,
  };
}
