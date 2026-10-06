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

  // 1. /start command
  if (text === '/start') {
    await sendTelegramMessage(
      botToken,
      chatId,
      `Welcome to Physique 57 Support Desk! 🏋️‍♀️\n\nPlease link your employee account:\n/link your.email@physique57.in\n\nCommands:\n• /link <email> - Connect your work account\n• /status <REQ-ID> - Check ticket status\n• /help - Display instructions`
    );
    return NextResponse.json({ ok: true });
  }

  // 2. /help command
  if (text === '/help') {
    await sendTelegramMessage(
      botToken,
      chatId,
      `Physique 57 Support Desk Commands:\n• /link <email> - Link your Telegram account with your work email\n• /status <REQ-ID> - Check the status of your ticket\n• Send any message - Automatically creates a support ticket`
    );
    return NextResponse.json({ ok: true });
  }

  // 3. /link <email> command
  if (text.startsWith('/link')) {
    const rawEmail = text.replace(/^\/link\s*/i, '').trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes('@')) {
      await sendTelegramMessage(
        botToken,
        chatId,
        'Please provide a valid employee email address.\nExample: /link ananya.sharma@physique57.in'
      );
      return NextResponse.json({ ok: true });
    }

    const employees = await getAllEmployees();
    const matchedEmployee = employees.find(
      (e) => e.email.toLowerCase().trim() === rawEmail
    );

    if (!matchedEmployee) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `Email '${rawEmail}' was not found in the employee directory. Please use your registered Physique 57 work email.`
      );
      return NextResponse.json({ ok: true });
    }

    await setTelegramLink(chatIdStr, matchedEmployee.email);
    await sendTelegramMessage(
      botToken,
      chatId,
      `✅ Account linked successfully to ${matchedEmployee.name} (${matchedEmployee.email})!\n\nYou can now send any message here to create support tickets or use /status <REQ-ID> to track progress.`
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
        'Please link your account first: /link your.email@physique57mumbai.com'
      );
      return NextResponse.json({ ok: true });
    }

    const ticketNumber = match[1].toUpperCase();
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

    await sendTelegramMessage(
      botToken,
      chatId,
      `Ticket: ${ticket.ticket_number}\nStatus: ${ticket.status.toUpperCase()}\nAssignee: ${assigneeName}\nSLA target: ${slaTarget}`
    );
    return NextResponse.json({ ok: true });
  }

  // 5. Regular messages -> Ticket Ingestion
  const linkedAccount = await getTelegramLink(chatIdStr);
  if (!linkedAccount) {
    await sendTelegramMessage(
      botToken,
      chatId,
      'Please link your account first: /link your.email@physique57mumbai.com'
    );
    return NextResponse.json({ ok: true });
  }

  // Resolve employee metadata
  const employees = await getAllEmployees();
  const emp = employees.find(
    (e) => e.email.toLowerCase().trim() === linkedAccount.employee_email.toLowerCase().trim()
  );

  const senderName = emp ? emp.name : 'Telegram User';
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
    const replyText = `Ticket created: ${intakeResult.ticket.ticket_number} | Category: ${intakeResult.ticket.category} | Priority: ${intakeResult.ticket.priority} | SLA target: ${istTimestamp}`;

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
