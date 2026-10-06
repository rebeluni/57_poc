import { NextRequest, NextResponse } from 'next/server';

const EXPECTED_PASSCODE = process.env.ADMIN_PASSCODE || 'p57barre';

export async function POST(req: NextRequest) {
  try {
    const { passcode } = await req.json();

    if (!passcode || passcode.trim() !== EXPECTED_PASSCODE) {
      return NextResponse.json({ error: 'Incorrect administrator passcode' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true, message: 'Authenticated' });
    res.cookies.set('p57_admin_auth', 'authenticated', {
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
  const authCookie = req.cookies.get('p57_admin_auth');
  const isAuthenticated = authCookie?.value === 'authenticated';
  return NextResponse.json({ isAuthenticated });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: 'Logged out' });
  res.cookies.delete('p57_admin_auth');
  return res;
}
