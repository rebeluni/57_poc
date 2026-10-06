// ==============================================================================
// Physique 57 · People Desk
// Admin Authentication & HMAC Security Utilities
// ==============================================================================

import crypto from 'node:crypto';
import { NextRequest } from 'next/server';

export const ADMIN_COOKIE_NAME = 'p57_admin_auth';

function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.ADMIN_PASSCODE ||
    'p57-default-dev-auth-secret-do-not-use-in-production'
  );
}

/**
 * Creates a signed admin session token with timestamp-based expiry.
 * Format: `<expiryMs>.<hmacSignature>`
 * Default duration: 7 days.
 */
export function createAdminToken(durationMs: number = 7 * 24 * 60 * 60 * 1000): string {
  const expiry = Date.now() + durationMs;
  const secret = getAuthSecret();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(String(expiry))
    .digest('hex');
  return `${expiry}.${signature}`;
}

/**
 * Verifies an HMAC-signed admin token using constant-time comparison.
 */
export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [expiryStr, signature] = parts;
  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry) || Date.now() > expiry) {
    return false; // Token expired or invalid timestamp
  }

  const secret = getAuthSecret();
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(String(expiry))
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Validates whether the incoming NextRequest contains a valid admin session cookie.
 */
export function requireAdmin(req: NextRequest): boolean {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminToken(token);
}
