// ==============================================================================
// Physique 57 · People Desk
// Public Ticket Tracking Endpoint (Secure & Scoped)
// Requires both Ticket Number and matching Requester Email
// Returns only safe, public-facing timeline fields (no internal notes/actors)
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getTicketByNumber } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (!id || !id.trim()) {
      return NextResponse.json(
        { error: 'Ticket identifier (e.g. REQ-2026-0001) is required.' },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Requester email address is required to verify ticket access.' },
        { status: 400 }
      );
    }

    const ticket = await getTicketByNumber(id.trim(), email.trim());

    if (!ticket) {
      return NextResponse.json(
        { error: 'No matching ticket found. Please verify the ticket number and your employee email.' },
        { status: 404 }
      );
    }

    // Verify email case-insensitively
    if (ticket.requester_email.toLowerCase().trim() !== email.toLowerCase().trim()) {
      return NextResponse.json(
        { error: 'The email address provided does not match the requester on this ticket.' },
        { status: 403 }
      );
    }

    // Return strictly sanitized public fields
    const safeTicket = {
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      created_at: ticket.created_at,
      first_response_at: ticket.first_response_at || null,
      resolved_at: ticket.resolved_at || null,
      assignee_name: ticket.assignee ? ticket.assignee.name : 'People Operations Specialist',
      assignee_department: ticket.assignee ? ticket.assignee.department : ticket.category,
      response_due_at: ticket.response_due_at,
      resolve_due_at: ticket.resolve_due_at,
      sla_state: ticket.sla_state || 'On Track',
      time_remaining_str: ticket.time_remaining_str || '',
      resolution_note: ticket.status === 'finalized' ? ticket.resolution_note : null,
    };

    return NextResponse.json({ success: true, ticket: safeTicket });
  } catch (error) {
    console.error('Error in /api/track:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while looking up the ticket.' },
      { status: 500 }
    );
  }
}
