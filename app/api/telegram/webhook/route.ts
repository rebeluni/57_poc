// ==============================================================================
// Physique 57 · People Desk
// Optional Telegram Omnichannel Webhook Endpoint
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getAllEmployees,
  getTicketByNumber,
  getTelegramLink,
  setTelegramLink,
} from '@/lib/db';
import { processIntakeRequest } from '@/lib/intake';

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function formatIST(dateIso: string): string {
  return (
    new Date(dateIso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + ' IST'
  );
}

function getAppBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (
    envUrl &&
    !envUrl.includes('localhost') &&
    !envUrl.includes('temp.vercel.app') &&
    !envUrl.includes('placeholder')
  ) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'https://57-poc.vercel.app';
}

async function sendTelegramMessage(botToken: string, chatId: number | string, text: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error('Telegram sendMessage error:', errBody);
    }
  } catch (err) {
    console.error('Telegram network error:', err);
  }
}

export async function POST(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  // If Telegram is not configured, fail with 404 immediately
  if (!botToken) {
    return NextResponse.json({ error: 'Telegram integration is disabled' }, { status: 404 });
  }

  // Timing-safe secret token verification
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');

  if (!webhookSecret || !secretHeader || !timingSafeEqualStr(secretHeader, webhookSecret)) {
    return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Telegram updates may be edits, reactions, etc. We only care about message text
  const message = body?.message;
  if (!message || !message.text || !message.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const chatIdStr = String(chatId);
  const text = message.text.trim();
  const baseUrl = getAppBaseUrl();

  // 1. /start command
  if (text === '/start') {
    await sendTelegramMessage(
      botToken,
      chatId,
      `Welcome to Physique 57 Support Desk! 🏋️‍♀️\n\nPlease link your email to get started:\n/link yourname@gmail.com\n\nCommands:\n• /link <email> - Connect any email (work or personal)\n• /status <REQ-ID> - Check ticket status & SLA\n• Any message - Create a support ticket automatically\n\n🌐 Web App Portal:\n${baseUrl}`
    );
    return NextResponse.json({ ok: true });
  }

  // 2. /help command
  if (text === '/help') {
    await sendTelegramMessage(
      botToken,
      chatId,
      `Physique 57 Support Desk Commands:\n• /link <email> - Link your Telegram account with any email (e.g. /link yourname@gmail.com)\n• /status <REQ-ID> - Check the status of your ticket\n• Send any message - Automatically creates a support ticket\n\n🌐 Web App Portal:\n${baseUrl}`
    );
    return NextResponse.json({ ok: true });
  }

  // 3. /link <email> command (allows any email address during testing)
  if (text.startsWith('/link')) {
    const rawEmail = text.replace(/^\/link\s*/i, '').trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes('@')) {
      await sendTelegramMessage(
        botToken,
        chatId,
        'Please provide a valid email address.\nExample: /link yourname@gmail.com'
      );
      return NextResponse.json({ ok: true });
    }

    const employees = await getAllEmployees();
    const matchedEmployee = employees.find(
      (e) => e.email.toLowerCase().trim() === rawEmail
    );

    const telegramUserName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ');
    const displayName = matchedEmployee
      ? matchedEmployee.name
      : (telegramUserName || rawEmail.split('@')[0]);

    await setTelegramLink(chatIdStr, rawEmail);
    await sendTelegramMessage(
      botToken,
      chatId,
      `✅ Account linked successfully to ${displayName} (${rawEmail})!\n\nYou can now send any message here to create support tickets or use /status <REQ-ID> to track progress.`
    );
    return NextResponse.json({ ok: true });
  }

  // 4. /status <REQ-YYYY-NNNN> command
  if (text.startsWith('/status')) {
    const match = text.match(/REQ-\d{4}-\d{4}/i);
    if (!match) {
      await sendTelegramMessage(
        botToken,
        chatId,
        'Please specify a ticket number.\nExample: /status REQ-2026-0001'
      );
      return NextResponse.json({ ok: true });
    }

    const linkedAccount = await getTelegramLink(chatIdStr);
    if (!linkedAccount) {
      await sendTelegramMessage(
        botToken,
        chatId,
        'Please link your account first:\n/link ananya.sharma@physique57.in'
      );
      return NextResponse.json({ ok: true });
    }

    const ticketNumber = match[0].toUpperCase();
    const ticket = await getTicketByNumber(ticketNumber);

    if (!ticket) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `Ticket ${ticketNumber} was not found.`
      );
      return NextResponse.json({ ok: true });
    }

    // Only allow viewing if ticket belongs to the linked employee
    if (
      ticket.requester_email.toLowerCase().trim() !==
      linkedAccount.employee_email.toLowerCase().trim()
    ) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `You are not authorized to view ticket ${ticketNumber}.`
      );
      return NextResponse.json({ ok: true });
    }

    const slaTarget = formatIST(ticket.resolve_due_at);
    const assigneeName = ticket.assignee ? ticket.assignee.name : 'Human Triage Queue';
    const trackUrl = `${baseUrl}/track?id=${encodeURIComponent(ticket.ticket_number)}&email=${encodeURIComponent(linkedAccount.employee_email)}`;

    await sendTelegramMessage(
      botToken,
      chatId,
      `🎫 Ticket: ${ticket.ticket_number}\n• Status: ${ticket.status.toUpperCase()}\n• Assignee: ${assigneeName}\n• SLA Target: ${slaTarget}\n\n🔗 View full history & timeline in Web App:\n${trackUrl}`
    );
    return NextResponse.json({ ok: true });
  }

  // 5. Regular messages -> Ticket Ingestion
  const linkedAccount = await getTelegramLink(chatIdStr);
  if (!linkedAccount) {
    await sendTelegramMessage(
      botToken,
      chatId,
      'Please link your email first to submit requests:\n/link yourname@gmail.com'
    );
    return NextResponse.json({ ok: true });
  }

  // Resolve employee metadata if registered
  const employees = await getAllEmployees();
  const emp = employees.find(
    (e) => e.email.toLowerCase().trim() === linkedAccount.employee_email.toLowerCase().trim()
  );

  const telegramUserName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ');
  const senderName = emp
    ? emp.name
    : (telegramUserName || linkedAccount.employee_email.split('@')[0] || 'Telegram User');
  const senderEmail = linkedAccount.employee_email;
  const senderEmployeeId = emp ? emp.employee_code : null;

  // Subject: first line or first 80 characters of the message
  const firstLine = text.split('\n')[0].trim();
  const subject = (firstLine.length > 80 ? firstLine.slice(0, 80) : firstLine) || 'Telegram Request';

  try {
    const intakeResult = await processIntakeRequest(
      {
        channel: 'Telegram',
        sender_name: senderName,
        sender_email: senderEmail,
        sender_employee_id: senderEmployeeId,
        subject,
        body: text,
        urgent: false,
      },
      'Telegram Bot Adapter'
    );

    const istTimestamp = formatIST(intakeResult.ticket.resolve_due_at);
    const trackUrl = `${baseUrl}/track?id=${encodeURIComponent(intakeResult.ticket.ticket_number)}&email=${encodeURIComponent(senderEmail)}`;
    const replyText = `✅ Ticket Created: ${intakeResult.ticket.ticket_number}\n\n• Category: ${intakeResult.ticket.category}\n• Priority: ${intakeResult.ticket.priority}\n• SLA Target: ${istTimestamp}\n\n🔗 Track live progress in Web App:\n${trackUrl}`;

    await sendTelegramMessage(botToken, chatId, replyText);
  } catch (err) {
    console.error('Error processing Telegram intake ticket:', err);
    await sendTelegramMessage(
      botToken,
      chatId,
      '⚠️ An error occurred while creating your ticket. Please try again shortly.'
    );
  }

  return NextResponse.json({ ok: true });
}
