import { NextRequest, NextResponse } from 'next/server';
import { getTickets, runEscalationWatchdog } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const category = searchParams.get('category') || 'all';
    const priority = searchParams.get('priority') || 'all';
    const channel = searchParams.get('channel') || 'all';
    const assignee_id = searchParams.get('assignee_id') || 'all';
    const slaState = searchParams.get('slaState') || 'all';
    const search = searchParams.get('search') || '';
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Run watchdog to ensure SLA escalations & auto-archive are up to date on page view
    await runEscalationWatchdog();

    const tickets = await getTickets({
      status,
      category,
      priority,
      channel,
      assigneeId: assignee_id,
      slaState,
      search,
      includeArchived,
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Error in GET /api/tickets:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}
