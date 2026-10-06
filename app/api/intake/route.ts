import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SUPPORTED_CHANNELS, TicketChannel } from '@/lib/config';
import { processIntakeRequest } from '@/lib/intake';

// Simple in-memory IP rate limiter: max 30 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }
  if (entry.count >= 30) {
    return false;
  }
  entry.count++;
  return true;
}

// Zod Schema for input validation
const IntakeSchema = z.object({
  channel: z.enum(SUPPORTED_CHANNELS as [TicketChannel, ...TicketChannel[]]),
  sender_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  sender_email: z.string().email('Please enter a valid email address'),
  sender_employee_id: z.string().optional().nullable(),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200),
  body: z.string().min(5, 'Description must be at least 5 characters').max(3000),
  urgent: z.boolean().optional().default(false),
  received_at: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // 1. IP Rate Limiting
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a minute before submitting again.' },
      { status: 429 }
    );
  }

  try {
    const rawBody = await req.json();

    // Omnichannel Webhook Normalization: Map common aliases and normalize casing
    const normalizedChannelMap: Record<string, TicketChannel> = {
      'web': 'Web Form',
      'web form': 'Web Form',
      'webform': 'Web Form',
      'email': 'Email',
      'whatsapp': 'WhatsApp',
      'sms': 'SMS',
      'instagram': 'Instagram DM',
      'instagram dm': 'Instagram DM',
      'instagram_dm': 'Instagram DM',
      'intercom': 'Intercom Chat',
      'intercom chat': 'Intercom Chat',
      'chat': 'Intercom Chat',
      'telegram': 'Telegram',
    };

    const rawChannelLower = (rawBody.channel || '').toString().toLowerCase().trim();
    const resolvedChannel: TicketChannel =
      normalizedChannelMap[rawChannelLower] || (rawBody.channel as TicketChannel) || 'Web Form';

    const resolvedEmail = (rawBody.sender_email || rawBody.employee_email || rawBody.email || '').toString().trim();
    const fallbackName = resolvedEmail
      ? resolvedEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      : 'Anonymous Employee';
    const resolvedName = (rawBody.sender_name || rawBody.employee_name || rawBody.name || fallbackName).toString().trim();
    const resolvedBody = (rawBody.body || rawBody.description || rawBody.message || rawBody.text || '').toString().trim();
    const resolvedUrgent = Boolean(rawBody.urgent ?? rawBody.is_urgent ?? false);

    const payloadToValidate = {
      ...rawBody,
      channel: resolvedChannel,
      sender_name: resolvedName,
      sender_email: resolvedEmail,
      body: resolvedBody,
      urgent: resolvedUrgent,
    };

    const parseResult = IntakeSchema.safeParse(payloadToValidate);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      channel,
      sender_name,
      sender_email,
      sender_employee_id,
      subject,
      body,
      urgent,
    } = parseResult.data;

    // Process using unified shared intake pipeline
    const result = await processIntakeRequest({
      channel,
      sender_name,
      sender_email,
      sender_employee_id,
      subject,
      body,
      urgent,
    });

    return NextResponse.json({
      success: true,
      ticket: result.ticket,
      analysis: result.analysis,
    });
  } catch (error) {
    console.error('Error in /api/intake:', error);
    return NextResponse.json({ error: 'Internal server error processing request' }, { status: 500 });
  }
}
