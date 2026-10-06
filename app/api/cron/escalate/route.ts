import { NextResponse } from 'next/server';
import { runEscalationWatchdog } from '@/lib/db';

export async function GET() {
  try {
    const stats = await runEscalationWatchdog();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    });
  } catch (error) {
    console.error('Error in /api/cron/escalate:', error);
    return NextResponse.json({ error: 'Watchdog run failed' }, { status: 500 });
  }
}
