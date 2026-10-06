// ==============================================================================
// Physique 57 · People Desk
// SLA & Business Hours Calculation Engine (IST: 9:00 AM - 7:00 PM, Mon - Sat)
// ==============================================================================

import { BUSINESS_HOURS, SLA_CONFIG, TicketPriority, EscalationLevel, TicketStatus } from './config';
import { SLACalculationResult } from './types';

/**
 * Converts a UTC Date into an IST Date object for time calculations.
 * IST is UTC + 5 hours 30 minutes.
 */
export function toISTDate(date: Date): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + BUSINESS_HOURS.utcOffsetMinutes * 60000);
}

/**
 * Converts an IST Date object back to a standard UTC Date.
 */
export function fromISTDate(istDate: Date): Date {
  const utc = istDate.getTime() - BUSINESS_HOURS.utcOffsetMinutes * 60000;
  return new Date(utc - istDate.getTimezoneOffset() * 60000);
}

/**
 * Checks if a given day of week is a valid business workday.
 * 0 = Sunday (Off), 1 = Monday, ..., 6 = Saturday (Workday).
 */
export function isBusinessDay(dayOfWeek: number): boolean {
  return BUSINESS_HOURS.workDays.includes(dayOfWeek);
}

/**
 * Advances a date in IST to the next valid business window if currently outside.
 * - If before 9am on a workday: advances to 9:00 AM today.
 * - If after 7pm on a workday or on Sunday: advances to 9:00 AM on the next business day.
 */
function advanceToBusinessWindow(d: Date): Date {
  const date = new Date(d);

  // If Sunday (0), move to Monday 9 AM
  if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
    date.setHours(BUSINESS_HOURS.startHour, 0, 0, 0);
    return date;
  }

  const hour = date.getHours();
  const minutes = date.getMinutes();
  const timeDecimal = hour + minutes / 60;

  // Before 9:00 AM
  if (timeDecimal < BUSINESS_HOURS.startHour) {
    date.setHours(BUSINESS_HOURS.startHour, 0, 0, 0);
    return date;
  }

  // After 7:00 PM (19:00)
  if (timeDecimal >= BUSINESS_HOURS.endHour) {
    date.setDate(date.getDate() + 1);
    // If next day is Sunday, skip to Monday
    if (date.getDay() === 0) {
      date.setDate(date.getDate() + 1);
    }
    date.setHours(BUSINESS_HOURS.startHour, 0, 0, 0);
    return date;
  }

  return date;
}

/**
 * Adds business hours to a starting date adhering to the 9am-7pm Mon-Sat schedule.
 */
export function addBusinessHours(startDate: Date, hoursToAdd: number): Date {
  // Work in IST
  let current = advanceToBusinessWindow(toISTDate(startDate));
  let remainingHours = hoursToAdd;

  while (remainingHours > 0) {
    // Current time in day decimal
    const currentDecimal = current.getHours() + current.getMinutes() / 60 + current.getSeconds() / 3600;
    const hoursLeftToday = BUSINESS_HOURS.endHour - currentDecimal;

    if (remainingHours <= hoursLeftToday) {
      // Finished within today's window
      const addedMs = remainingHours * 3600 * 1000;
      current = new Date(current.getTime() + addedMs);
      remainingHours = 0;
    } else {
      // Deduct today's remaining business hours and roll to tomorrow 9am
      remainingHours -= hoursLeftToday;
      current.setDate(current.getDate() + 1);
      // Skip Sunday
      if (current.getDay() === 0) {
        current.setDate(current.getDate() + 1);
      }
      current.setHours(BUSINESS_HOURS.startHour, 0, 0, 0);
    }
  }

  return fromISTDate(current);
}

/**
 * Calculates response and resolution due dates for a given priority and creation timestamp.
 */
export function calculateSLADueDates(
  createdAt: Date = new Date(),
  priority: TicketPriority
): SLACalculationResult {
  const slaDef = SLA_CONFIG[priority];
  const responseDueAt = addBusinessHours(createdAt, slaDef.responseHours);
  const resolveDueAt = addBusinessHours(createdAt, slaDef.resolveHours);

  return {
    responseDueAt,
    resolveDueAt,
    responseHours: slaDef.responseHours,
    resolveHours: slaDef.resolveHours,
  };
}

/**
 * Computes elapsed SLA percentage, state badge, and escalation level.
 * For FINALIZED tickets:
 * - Never shows "Breached" or an active countdown.
 * - Compares resolved_at with resolve_due_at and returns "Met SLA" or "Resolved late by Xh Ym".
 */
export function evaluateSLAState(
  createdAt: Date | string,
  dueAt: Date | string,
  resolvedAt?: Date | string | null,
  status?: TicketStatus
): {
  elapsedPercent: number;
  slaState: 'On Track' | 'Breaching Soon' | 'Breached' | 'Met SLA' | 'Resolved Late';
  escalationLevel: EscalationLevel;
  timeRemainingStr: string;
} {
  const start = new Date(createdAt).getTime();
  const target = new Date(dueAt).getTime();
  const isFinalized = status === 'finalized' || Boolean(resolvedAt);

  if (isFinalized) {
    const resolvedTime = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
    const totalDuration = Math.max(1, target - start);
    const elapsed = Math.max(0, resolvedTime - start);
    const elapsedPercent = Math.round((elapsed / totalDuration) * 100);

    const diffMs = resolvedTime - target;
    if (diffMs <= 0) {
      return {
        elapsedPercent,
        slaState: 'Met SLA',
        escalationLevel: 'L0',
        timeRemainingStr: 'Met SLA',
      };
    } else {
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return {
        elapsedPercent,
        slaState: 'Resolved Late',
        escalationLevel: 'L0',
        timeRemainingStr: `Resolved late by ${hours}h ${minutes}m`,
      };
    }
  }

  // Active / Open ticket evaluation
  const current = Date.now();
  const totalDuration = Math.max(1, target - start);
  const elapsed = Math.max(0, current - start);
  const elapsedPercent = Math.round((elapsed / totalDuration) * 100);

  const diffMs = target - current;
  const isBreached = diffMs <= 0;

  let timeRemainingStr: string;
  const absDiff = Math.abs(diffMs);
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

  if (isBreached) {
    timeRemainingStr = `Breached by ${hours}h ${minutes}m`;
  } else if (hours > 24) {
    const days = Math.floor(hours / 24);
    timeRemainingStr = `${days}d ${hours % 24}h remaining`;
  } else {
    timeRemainingStr = `${hours}h ${minutes}m remaining`;
  }

  let slaState: 'On Track' | 'Breaching Soon' | 'Breached';
  let escalationLevel: EscalationLevel;

  if (elapsedPercent >= 150) {
    slaState = 'Breached';
    escalationLevel = 'L3';
  } else if (elapsedPercent >= 100) {
    slaState = 'Breached';
    escalationLevel = 'L2';
  } else if (elapsedPercent >= 80) {
    slaState = 'Breaching Soon';
    escalationLevel = 'L1';
  } else {
    slaState = 'On Track';
    escalationLevel = 'L0';
  }

  return {
    elapsedPercent,
    slaState,
    escalationLevel,
    timeRemainingStr,
  };
}

/**
 * Calculates SLA compliance percentage across finalized tickets.
 * Compliance = finalized tickets resolved before/on resolve_due_at divided by all finalized tickets.
 * Returns 100 if there are no finalized tickets.
 */
export function calculateSLACompliance(
  tickets: Array<{
    status: TicketStatus;
    resolved_at?: string | null;
    resolve_due_at: string;
  }>
): number {
  const finalized = tickets.filter((t) => t.status === 'finalized');
  if (finalized.length === 0) return 100;

  const met = finalized.filter(
    (t) =>
      t.resolved_at &&
      new Date(t.resolved_at).getTime() <= new Date(t.resolve_due_at).getTime()
  ).length;

  return Math.round((met / finalized.length) * 100);
}

/**
 * Counts SLA breaches among open/active tickets past due.
 */
export function countSLABreaches(
  tickets: Array<{
    status: TicketStatus;
    resolve_due_at: string;
    sla_state?: string;
  }>,
  asOf: Date = new Date()
): number {
  const now = asOf.getTime();
  return tickets.filter(
    (t) =>
      (t.status === 'open' || t.status === 'active') &&
      now > new Date(t.resolve_due_at).getTime()
  ).length;
}

