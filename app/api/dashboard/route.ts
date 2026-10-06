import { NextRequest, NextResponse } from 'next/server';
import { getDashboardMetrics, runEscalationWatchdog } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }
  try {
    // Run watchdog prior to aggregating metrics
    await runEscalationWatchdog();
    const data = await getDashboardMetrics();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
