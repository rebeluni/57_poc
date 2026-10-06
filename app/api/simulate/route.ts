import { NextRequest, NextResponse } from 'next/server';
import { PREFILL_EXAMPLES, SUPPORTED_CHANNELS, TicketChannel } from '@/lib/config';
import { requireAdmin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }
  try {
    // Pick random example or randomize channel
    const randomExample = PREFILL_EXAMPLES[Math.floor(Math.random() * PREFILL_EXAMPLES.length)];
    const randomChannel: TicketChannel =
      SUPPORTED_CHANNELS[Math.floor(Math.random() * SUPPORTED_CHANNELS.length)];

    // Call /api/intake internally
    const intakePayload = {
      channel: randomChannel,
      sender_name: randomExample.name,
      sender_email: randomExample.email,
      sender_employee_id: randomExample.employeeId,
      subject: `[Simulated ${randomChannel}] ${randomExample.subject}`,
      body: randomExample.description,
      urgent: randomExample.urgent,
    };

    // Forward to intake endpoint
    const url = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    // We can also invoke /api/intake handler directly or fetch
    const response = await fetch(`${url}/api/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intakePayload),
    }).catch(() => null);

    if (response && response.ok) {
      const data = await response.json();
      return NextResponse.json({ success: true, ticket: data.ticket, channel: randomChannel });
    }

    // Direct fallback if fetch localhost fails in isolated server context
    const { categorizeRequest, determinePriority } = await import('@/lib/categoriser');
    const { calculateSLADueDates } = await import('@/lib/sla');
    const { routeToAssignee } = await import('@/lib/routing');
    const { createTicket, getAllTeamMembers, getTickets } = await import('@/lib/db');

    const cat = categorizeRequest(intakePayload.subject, intakePayload.body);
    const pri = determinePriority(cat.category, intakePayload.subject, intakePayload.body, intakePayload.urgent);
    const sla = calculateSLADueDates(new Date(), pri);
    const existing = await getTickets({ includeArchived: false });
    const members = await getAllTeamMembers();
    const { assignee } = routeToAssignee(cat.category, members, existing);

    const ticket = await createTicket(
      {
        requester_name: intakePayload.sender_name,
        requester_email: intakePayload.sender_email,
        requester_employee_id: intakePayload.sender_employee_id,
        channel: randomChannel,
        subject: intakePayload.subject,
        description: intakePayload.body,
        category: cat.category,
        category_source: 'rule',
        category_confidence: cat.confidence,
        matched_keywords: cat.matchedKeywords,
        priority: pri,
        status: 'open',
        assignee_id: assignee ? assignee.id : null,
        urgent_flag: intakePayload.urgent,
        response_due_at: sla.responseDueAt.toISOString(),
        resolve_due_at: sla.resolveDueAt.toISOString(),
        first_response_at: null,
        resolved_at: null,
        resolution_note: null,
        escalation_level: 'L0',
        possible_duplicate_of: null,
        archived: false,
      },
      `OmniChannel Simulator (${randomChannel})`
    );

    return NextResponse.json({ success: true, ticket, channel: randomChannel });
  } catch (error) {
    console.error('Error simulating incoming message:', error);
    return NextResponse.json({ error: 'Failed to simulate message' }, { status: 500 });
  }
}
