// ==============================================================================
// Physique 57 · People Desk
// Categorisation & Priority Matrix Engine
// ==============================================================================

import {
  CATEGORY_CONFIG,
  DepartmentCategory,
  TicketPriority,
} from './config';
import { CategorisationResult } from './types';

/**
 * Normalises input text for consistent keyword matching.
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/['"’“”]/g, '').trim();
}

/**
 * Evaluates text against weighted keywords for each department.
 * Deterministic, explainable, and returns matched keywords + confidence.
 */
export function categorizeRequest(
  subject: string,
  description: string
): CategorisationResult {
  const combinedText = normalizeText(`${subject} ${description}`);

  const scores: Record<DepartmentCategory, { score: number; matches: string[] }> = {
    HR: { score: 0, matches: [] },
    IT: { score: 0, matches: [] },
    Payroll: { score: 0, matches: [] },
    Operations: { score: 0, matches: [] },
    Other: { score: 0, matches: [] },
  };

  // Evaluate each department's keyword rules
  (Object.keys(CATEGORY_CONFIG) as DepartmentCategory[]).forEach((dept) => {
    if (dept === 'Other') return;
    const def = CATEGORY_CONFIG[dept];

    def.keywords.forEach(({ keyword, weight }) => {
      const normalizedKeyword = normalizeText(keyword);
      // Word boundary check or phrase substring match
      if (combinedText.includes(normalizedKeyword)) {
        scores[dept].score += weight;
        if (!scores[dept].matches.includes(keyword)) {
          scores[dept].matches.push(keyword);
        }
      }
    });
  });

  // Sort departments by score descending
  const sorted = (['Payroll', 'HR', 'IT', 'Operations'] as DepartmentCategory[]).sort(
    (a, b) => scores[b].score - scores[a].score
  );

  const topDept = sorted[0];
  const topScore = scores[topDept].score;
  const secondDept = sorted[1];
  const secondScore = scores[secondDept].score;

  // Zero matches: Fallback to Other
  if (topScore === 0) {
    return {
      category: 'Other',
      confidence: 0.2,
      matchedKeywords: [],
      source: 'rule',
      reason: 'No standard department keywords identified. Routed to triage queue.',
    };
  }

  // Calculate normalized confidence (0.0 to 1.0)
  // Higher score gap between 1st and 2nd rank = higher confidence
  let confidence: number;
  if (secondScore === 0) {
    // Unambiguous match
    confidence = Math.min(0.98, 0.70 + topScore * 0.05);
  } else {
    const gap = (topScore - secondScore) / topScore;
    confidence = Math.min(0.95, 0.50 + gap * 0.40);
  }

  // Cap at 2 decimal places
  confidence = Math.round(confidence * 100) / 100;

  return {
    category: topDept,
    confidence,
    matchedKeywords: scores[topDept].matches,
    source: 'rule',
    reason: `Matched ${scores[topDept].matches.length} keyword(s): ${scores[topDept].matches.join(', ')}.`,
  };
}

/**
 * Determines ticket priority (P1 to P4) using the priority matrix.
 * Considers detected category, keywords, and explicit urgency flag.
 */
export function determinePriority(
  category: DepartmentCategory,
  subject: string,
  description: string,
  urgentFlag: boolean
): TicketPriority {
  const combined = normalizeText(`${subject} ${description}`);

  // Critical P1 triggers
  const p1Keywords = [
    'salary not credited',
    'not credited',
    'system down',
    'studio outage',
    'data breach',
    'broken glass',
    'safety hazard',
    'payroll blocked',
  ];

  for (const phrase of p1Keywords) {
    if (combined.includes(phrase)) {
      return 'P1';
    }
  }

  // P1 if marked urgent AND in Payroll or critical IT
  if (urgentFlag && (category === 'Payroll' || category === 'IT')) {
    return 'P1';
  }

  // High P2 triggers
  const p2Keywords = [
    'mirror',
    'wifi',
    'app crash',
    'crash',
    'leak',
    'sound system',
    'amplifier',
    'pos down',
    'check-in down',
    'biometric down',
  ];

  if (urgentFlag) {
    return 'P2';
  }

  for (const phrase of p2Keywords) {
    if (combined.includes(phrase)) {
      return 'P2';
    }
  }

  // Low P4 triggers
  const p4Keywords = ['parking', 'visitor', 'sticker', 'general question', 'general query'];
  for (const phrase of p4Keywords) {
    if (combined.includes(phrase)) {
      return 'P4';
    }
  }

  if (category === 'Other') {
    return 'P4';
  }

  // Default normal priority
  return 'P3';
}
