import { NextResponse } from 'next/server';
import { getDashboardMetrics, runEscalationWatchdog } from '@/lib/db';

export async function GET() {
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
