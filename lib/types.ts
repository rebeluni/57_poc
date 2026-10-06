// ==============================================================================
// Physique 57 · People Desk
// Type Definitions
// ==============================================================================

import { DepartmentCategory, TicketPriority, TicketStatus, EscalationLevel, TicketChannel } from './config';

export interface Employee {
  id: string;
  name: string;
  email: string;
  employee_code: string;
  department: string;
  role: string;
  created_at?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  department: DepartmentCategory;
  is_team_lead: boolean;
  is_dept_head: boolean;
  out_of_office: boolean;
  created_at?: string;
  open_tickets_count?: number;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  requester_name: string;
  requester_email: string;
  requester_employee_id?: string | null;
  channel: TicketChannel;
  subject: string;
  description: string;
  category: DepartmentCategory;
  category_source: 'rule' | 'ai' | 'manual';
  category_confidence: number;
  matched_keywords: string[];
  priority: TicketPriority;
  status: TicketStatus;
  assignee_id?: string | null;
  assignee?: TeamMember | null;
  urgent_flag: boolean;
  response_due_at: string;
  resolve_due_at: string;
  first_response_at?: string | null;
  resolved_at?: string | null;
  resolution_note?: string | null;
  escalation_level: EscalationLevel;
  possible_duplicate_of?: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields for UI convenience
  sla_state?: 'On Track' | 'Breaching Soon' | 'Breached' | 'Met SLA' | 'Resolved Late';
  sla_elapsed_percent?: number;
  time_remaining_str?: string;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  actor: string;
  action:
    | 'created'
    | 'assigned'
    | 'status_change'
    | 'reassigned'
    | 'priority_override'
    | 'category_override'
    | 'note_added'
    | 'escalated'
    | 'reopened'
    | 'archived';
  from_value?: string | null;
  to_value?: string | null;
  note?: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  ticket_id: string;
  recipient_role: 'owner' | 'team_lead' | 'dept_head';
  recipient_name: string;
  channel: string;
  level: string;
  message: string;
  is_read: boolean;
  created_at: string;
  ticket?: Ticket;
}

export interface IntakePayload {
  channel: TicketChannel;
  sender_name: string;
  sender_email: string;
  sender_employee_id?: string;
  subject: string;
  body: string;
  urgent?: boolean;
  received_at?: string;
}

export interface CategorisationResult {
  category: DepartmentCategory;
  confidence: number; // 0.00 to 1.00
  matchedKeywords: string[];
  source: 'rule' | 'ai';
  reason?: string;
}

export interface SLACalculationResult {
  responseDueAt: Date;
  resolveDueAt: Date;
  responseHours: number;
  resolveHours: number;
}
