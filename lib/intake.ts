// ==============================================================================
// Physique 57 · People Desk
// Shared Intake Processing Pipeline (Used by /api/intake & /api/telegram/webhook)
// ==============================================================================

import { categorizeRequest, determinePriority } from './categoriser';
import { classifyWithGemini } from './ai';
import { calculateSLADueDates } from './sla';
import { routeToAssignee } from './routing';
import { findPossibleDuplicate } from './duplicate';
import {
  createTicket,
  getAllTeamMembers,
  getTickets,
} from './db';
import { DepartmentCategory, TicketChannel, TicketPriority } from './config';
import { Ticket } from './types';

export interface ProcessIntakeInput {
  channel: TicketChannel;
  sender_name: string;
  sender_email: string;
  sender_employee_id?: string | null;
  subject: string;
  body: string;
  urgent?: boolean;
}

export interface ProcessIntakeResult {
  ticket: Ticket;
  analysis: {
    category: DepartmentCategory;
    confidence: number;
    matchedKeywords: string[];
    source: 'rule' | 'ai' | 'manual';
    reason?: string;
    priority: TicketPriority;
    assignedTo: string;
    routingReason: string;
    possibleDuplicateOf: string | null;
    responseDueAt: string;
    resolveDueAt: string;
  };
}

export function sanitize(text: string): string {
  return text.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Executes the end-to-end triaging, prioritization, SLA clock,
 * duplicate detection, least-load routing, and database storage for an incoming ticket.
 */
export async function processIntakeRequest(
  input: ProcessIntakeInput,
  actor?: string
): Promise<ProcessIntakeResult> {
  const cleanSubject = sanitize(input.subject);
  const cleanBody = sanitize(input.body);
  const isUrgent = Boolean(input.urgent);

  // 1. Rule-Based Categorisation (Deterministic keyword scoring)
  let catResult = categorizeRequest(cleanSubject, cleanBody);

  // 2. Optional AI Fallback if low confidence (< 0.60)
  if (catResult.confidence < 0.6) {
    const aiResult = await classifyWithGemini(cleanSubject, cleanBody);
    if (aiResult) {
      catResult = aiResult;
    }
  }

  // 3. Priority Determination via Matrix
  const priority = determinePriority(catResult.category, cleanSubject, cleanBody, isUrgent);

  // 4. SLA Due Date Calculation (IST Business Hours Mon-Sat 9am-7pm)
  const sla = calculateSLADueDates(new Date(), priority);

  // 5. Duplicate Detection (Same email + category + similar subject within 24h)
  const existingTickets = await getTickets({ includeArchived: false });
  const duplicateMatch = findPossibleDuplicate(
    input.sender_email,
    catResult.category,
    cleanSubject,
    existingTickets,
    24
  );

  // 6. Smart Routing & Least-Open-Tickets Load Balancing
  const teamMembers = await getAllTeamMembers();
  const { assignee, routingReason } = routeToAssignee(
    catResult.category,
    teamMembers,
    existingTickets
  );

  // 7. Create Ticket & Audit Record
  const createdTicket = await createTicket(
    {
      requester_name: input.sender_name,
      requester_email: input.sender_email,
      requester_employee_id: input.sender_employee_id || null,
      channel: input.channel,
      subject: cleanSubject,
      description: cleanBody,
      category: catResult.category,
      category_source: catResult.source,
      category_confidence: catResult.confidence,
      matched_keywords: catResult.matchedKeywords,
      priority,
      status: 'open',
      assignee_id: assignee ? assignee.id : null,
      urgent_flag: isUrgent,
      response_due_at: sla.responseDueAt.toISOString(),
      resolve_due_at: sla.resolveDueAt.toISOString(),
      first_response_at: null,
      resolved_at: null,
      resolution_note: null,
      escalation_level: 'L0',
      possible_duplicate_of: duplicateMatch ? duplicateMatch.ticket_number : null,
      archived: false,
    },
    actor || `OmniChannel Adapter (${input.channel})`
  );

  return {
    ticket: createdTicket,
    analysis: {
      category: catResult.category,
      confidence: catResult.confidence,
      matchedKeywords: catResult.matchedKeywords,
      source: catResult.source,
      reason: catResult.reason,
      priority,
      assignedTo: assignee ? assignee.name : 'Human Triage Queue',
      routingReason,
      possibleDuplicateOf: duplicateMatch ? duplicateMatch.ticket_number : null,
      responseDueAt: sla.responseDueAt.toISOString(),
      resolveDueAt: sla.resolveDueAt.toISOString(),
    },
  };
}
