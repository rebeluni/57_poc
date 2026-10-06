import { NextRequest, NextResponse } from 'next/server';
import {
  getTicketById,
  getTicketEvents,
  getAllTeamMembers,
  transitionTicketStatus,
  reassignTicket,
  overrideTicket,
  addInternalNote,
} from '@/lib/db';
import { DepartmentCategory, TicketPriority, TicketStatus } from '@/lib/config';
import { requireAdmin } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const ticket = await getTicketById(id);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const events = await getTicketEvents(id);
    const teamMembers = await getAllTeamMembers();

    return NextResponse.json({
      ticket,
      events,
      teamMembers,
    });
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // 1. Status Transition (Open -> Active -> Finalized or Reopen)
    if (action === 'status_transition') {
      const { newStatus, note, assigneeId, actor } = body;
      const result = await transitionTicketStatus(id, newStatus as TicketStatus, {
        note,
        assigneeId,
        actor: actor || 'Admin Staff',
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const events = await getTicketEvents(id);
      return NextResponse.json({ success: true, ticket: result.ticket, events });
    }

    // 2. Reassignment
    if (action === 'reassign') {
      const { newAssigneeId, actor } = body;
      const result = await reassignTicket(id, newAssigneeId || null, actor || 'Admin Staff');

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const events = await getTicketEvents(id);
      return NextResponse.json({ success: true, ticket: result.ticket, events });
    }

    // 3. Category / Priority Manual Override
    if (action === 'override') {
      const { category, priority, reason, actor } = body;
      if (!reason || reason.trim().length < 3) {
        return NextResponse.json({ error: 'A justification reason is required for overrides' }, { status: 400 });
      }

      const result = await overrideTicket(id, {
        category: category as DepartmentCategory,
        priority: priority as TicketPriority,
        reason: reason.trim(),
        actor: actor || 'Admin Staff',
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const events = await getTicketEvents(id);
      return NextResponse.json({ success: true, ticket: result.ticket, events });
    }

    // 4. Add Internal Note
    if (action === 'add_note') {
      const { note, actor } = body;
      if (!note || note.trim().length < 3) {
        return NextResponse.json({ error: 'Note cannot be blank' }, { status: 400 });
      }

      const result = await addInternalNote(id, note, actor || 'Admin Staff');
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const events = await getTicketEvents(id);
      return NextResponse.json({ success: true, events });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
