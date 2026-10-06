// ==============================================================================
// Physique 57 · People Desk
// Duplicate Detection Engine
// ==============================================================================

import { DepartmentCategory } from './config';
import { Ticket } from './types';

/**
 * Tokenizes text into distinctive lowercase alphanumeric words, ignoring common stop words.
 */
function tokenize(text: string): Set<string> {
  const stopWords = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or', 'is', 'it', 'my', 'please', 'need', 'i', 'with'
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
  return new Set(words);
}

/**
 * Calculates Jaccard token similarity coefficient between two subjects.
 */
export function calculateSubjectSimilarity(s1: string, s2: string): number {
  const tokens1 = tokenize(s1);
  const tokens2 = tokenize(s2);

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersectionCount = 0;
  tokens1.forEach((t) => {
    if (tokens2.has(t)) intersectionCount++;
  });

  const unionSize = new Set([...tokens1, ...tokens2]).size;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
}

/**
 * Checks existing tickets for potential duplicate requests from the same employee within 24 hours.
 */
export function findPossibleDuplicate(
  incomingEmail: string,
  incomingCategory: DepartmentCategory,
  incomingSubject: string,
  existingTickets: Ticket[],
  withinHours: number = 24
): Ticket | null {
  const normalizedEmail = incomingEmail.toLowerCase().trim();
  const cutoffTime = Date.now() - withinHours * 60 * 60 * 1000;

  for (const ticket of existingTickets) {
    // Only compare same requester email and category
    if (
      ticket.requester_email.toLowerCase().trim() === normalizedEmail &&
      ticket.category === incomingCategory
    ) {
      const ticketCreated = new Date(ticket.created_at).getTime();
      if (ticketCreated >= cutoffTime) {
        const similarity = calculateSubjectSimilarity(incomingSubject, ticket.subject);
        // If > 35% token overlap or direct substring match, flag as duplicate
        if (similarity >= 0.35 || incomingSubject.toLowerCase().includes(ticket.subject.toLowerCase())) {
          return ticket;
        }
      }
    }
  }

  return null;
}
