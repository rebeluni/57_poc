import test from 'node:test';
import assert from 'node:assert';
import { categorizeRequest, determinePriority } from '../lib/categoriser';
import { calculateSLADueDates, addBusinessHours, evaluateSLAState } from '../lib/sla';

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
