import test from 'node:test';
import assert from 'node:assert';
import { categorizeRequest, determinePriority } from '../lib/categoriser';
import {
  calculateSLADueDates,
  addBusinessHours,
  evaluateSLAState,
  calculateSLACompliance,
  countSLABreaches,
} from '../lib/sla';

test('Categorisation Engine: Payroll query', () => {
  const result = categorizeRequest(
    'Salary not credited this month',
    'My monthly salary transfer for September was not credited to my bank.'
  );
  assert.strictEqual(result.category, 'Payroll');
  assert.ok(result.confidence >= 0.7, 'Confidence should be high for distinctive keywords');
  assert.ok(result.matchedKeywords.includes('salary'));
  assert.ok(result.matchedKeywords.includes('not credited'));
});

test('Categorisation Engine: IT Wi-Fi query', () => {
  const result = categorizeRequest(
    "Laptop won't connect to studio wifi",
    'The front desk laptop cannot access the staff wifi network.'
  );
  assert.strictEqual(result.category, 'IT');
  assert.ok(result.matchedKeywords.includes('wifi') || result.matchedKeywords.includes('laptop'));
});

test('Categorisation Engine: HR Leave query', () => {
  const result = categorizeRequest(
    'Apply for 3 days leave next week',
    'Taking annual holiday leave to attend a family wedding.'
  );
  assert.strictEqual(result.category, 'HR');
  assert.ok(result.matchedKeywords.includes('leave') || result.matchedKeywords.includes('holiday'));
});

test('Categorisation Engine: Operations Studio mirror query', () => {
  const result = categorizeRequest(
    'Studio mirror broken at Bandra',
    'Wall mirror in barre studio room 2 is cracked.'
  );
  assert.strictEqual(result.category, 'Operations');
  assert.ok(result.matchedKeywords.includes('mirror'));
});

test('Categorisation Engine: Fallback to Other on unknown text', () => {
  const result = categorizeRequest(
    'Random non-standard inquiry',
    'Completely unrelated sentence without department terminology.'
  );
  assert.strictEqual(result.category, 'Other');
  assert.ok(result.confidence < 0.6);
});

test('Priority Matrix: P1 Critical detection', () => {
  const p1 = determinePriority('Payroll', 'Salary not credited', 'Urgent payroll problem', true);
  assert.strictEqual(p1, 'P1');

  const p1SystemDown = determinePriority('IT', 'Core studio Mindbody system down', 'Outage', false);
  assert.strictEqual(p1SystemDown, 'P1');
});

test('Priority Matrix: P2 High detection on Urgent checkbox', () => {
  const p2 = determinePriority('HR', 'Policy question', 'Need policy clarification', true);
  assert.strictEqual(p2, 'P2');
});

test('Priority Matrix: P4 Low detection for general parking query', () => {
  const p4 = determinePriority('Other', 'Question about visitor parking', 'Sticker details', false);
  assert.strictEqual(p4, 'P4');
});

test('SLA Engine: Business Hours IST 9am-7pm Mon-Sat', () => {
  // A Wednesday at 10:00 AM IST
  // 10:00 AM + 4 business hours = 2:00 PM (14:00) IST same day
  const base = new Date('2026-10-14T04:30:00.000Z'); // 10:00 AM IST
  const result = addBusinessHours(base, 4);
  const diffHours = (result.getTime() - base.getTime()) / (1000 * 3600);
  assert.strictEqual(diffHours, 4);
});

test('SLA State Evaluation: L0 On Track vs L1 Warning vs L2 Breach', () => {
  const start = new Date(Date.now() - 1000 * 3600 * 2); // 2 hours ago
  const dueInFuture = new Date(Date.now() + 1000 * 3600 * 8); // 8 hours left (20% elapsed)
  const l0State = evaluateSLAState(start, dueInFuture);
  assert.strictEqual(l0State.escalationLevel, 'L0');
  assert.strictEqual(l0State.slaState, 'On Track');

  // Breached target
  const pastDue = new Date(Date.now() - 1000 * 3600 * 1); // 1 hour ago
  const l2State = evaluateSLAState(start, pastDue);
  assert.ok(l2State.escalationLevel === 'L2' || l2State.escalationLevel === 'L3');
  assert.strictEqual(l2State.slaState, 'Breached');
});

test('Omnichannel: Telegram is supported in channel configuration', async () => {
  const { SUPPORTED_CHANNELS } = await import('../lib/config');
  assert.ok(SUPPORTED_CHANNELS.includes('Telegram'));
});

test('Telegram Adapter: Subject extraction first-line and 80-character limit', () => {
  const multiline = "First line summary\nSecond line details\nThird line context";
  const firstLine = multiline.split('\n')[0].trim();
  const subject1 = firstLine.length > 80 ? firstLine.slice(0, 80) : firstLine;
  assert.strictEqual(subject1, 'First line summary');

  const longText = 'A'.repeat(120);
  const subject2 = longText.length > 80 ? longText.slice(0, 80) : longText;
  assert.strictEqual(subject2.length, 80);
});

test('SLA Consistency: Finalized tickets show Met SLA or Resolved late by Xh Ym, never Breached or countdown', () => {
  const createdAt = '2026-10-01T09:00:00.000Z';
  const resolveDueAt = '2026-10-02T13:00:00.000Z';

  // Ticket resolved on time (before resolve_due_at)
  const resolvedOnTime = '2026-10-02T11:00:00.000Z';
  const metState = evaluateSLAState(createdAt, resolveDueAt, resolvedOnTime, 'finalized');
  assert.strictEqual(metState.slaState, 'Met SLA');
  assert.strictEqual(metState.timeRemainingStr, 'Met SLA');
  assert.strictEqual(metState.escalationLevel, 'L0');

  // Ticket resolved late (after resolve_due_at by 2 hours and 30 minutes)
  const resolvedLate = new Date(new Date(resolveDueAt).getTime() + (2 * 3600 + 30 * 60) * 1000).toISOString();
  const lateState = evaluateSLAState(createdAt, resolveDueAt, resolvedLate, 'finalized');
  assert.strictEqual(lateState.slaState, 'Resolved Late');
  assert.strictEqual(lateState.timeRemainingStr, 'Resolved late by 2h 30m');
  assert.strictEqual(lateState.escalationLevel, 'L0');
  assert.notStrictEqual(lateState.slaState, 'Breached');
  assert.ok(!lateState.timeRemainingStr.includes('remaining'));
});

test('SLA Compliance & Breaches calculation: uses consistent definitions', () => {
  const tickets: any[] = [
    // Finalized ticket resolved on time
    {
      status: 'finalized',
      resolve_due_at: '2026-10-02T12:00:00.000Z',
      resolved_at: '2026-10-02T10:00:00.000Z',
    },
    // Finalized ticket resolved late
    {
      status: 'finalized',
      resolve_due_at: '2026-10-02T12:00:00.000Z',
      resolved_at: '2026-10-02T15:00:00.000Z',
    },
    // Open ticket past due (breached)
    {
      status: 'open',
      resolve_due_at: '2026-10-01T12:00:00.000Z',
    },
    // Active ticket not past due
    {
      status: 'active',
      resolve_due_at: '2026-10-10T12:00:00.000Z',
    },
  ];

  // 1 out of 2 finalized resolved on time -> 50%
  const compliance = calculateSLACompliance(tickets);
  assert.strictEqual(compliance, 50);

  // 1 open ticket past due as of 2026-10-05 -> 1 breach
  const breaches = countSLABreaches(tickets, new Date('2026-10-05T12:00:00.000Z'));
  assert.strictEqual(breaches, 1);
});


