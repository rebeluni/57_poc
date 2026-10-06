import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken, requireAdmin, ADMIN_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { passcode } = await req.json();
    const expectedPasscode = process.env.ADMIN_PASSCODE || 'p57barre';

    if (!passcode || passcode.trim() !== expectedPasscode) {
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
  } catch (error) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const isAuthenticated = requireAdmin(req);
  return NextResponse.json({ isAuthenticated });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: 'Logged out' });
  res.cookies.delete(ADMIN_COOKIE_NAME);
  return res;
}
