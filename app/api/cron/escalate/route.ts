import { NextRequest, NextResponse } from 'next/server';
import { runEscalationWatchdog } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuthorized = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
  const isAdminAuthorized = requireAdmin(req);

  // Authorize if caller has valid CRON_SECRET bearer token OR valid admin cookie
  if (!isCronAuthorized && !isAdminAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized. Requires valid Bearer CRON_SECRET or admin session.' },
      { status: 401 }
    );
  }

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
