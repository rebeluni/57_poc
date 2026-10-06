import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken, requireAdmin, ADMIN_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const expectedPasscode = process.env.ADMIN_PASSCODE;
    if (!expectedPasscode || !expectedPasscode.trim()) {
      return NextResponse.json(
        { error: 'ADMIN_PASSCODE is not configured' },
        { status: 500 }
      );
    }

    const { passcode } = await req.json();

    if (!passcode || passcode.trim() !== expectedPasscode.trim()) {
      return NextResponse.json({ error: 'Incorrect administrator passcode' }, { status: 401 });
    }

    const token = createAdminToken();
    const res = NextResponse.json({ success: true, message: 'Authenticated' });
    res.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return res;
  } catch (error: any) {
    console.error('Error during passcode authentication:', error);
    return NextResponse.json(
      { error: error?.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const isAuthenticated = requireAdmin(req);
  return NextResponse.json(
    { isAuthenticated },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    }
  );
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: 'Logged out' });
  res.cookies.delete(ADMIN_COOKIE_NAME);
  return res;
}
