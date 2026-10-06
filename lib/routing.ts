// ==============================================================================
// Physique 57 · People Desk
// Smart Routing & Load-Balancing Engine
// ==============================================================================

import { DepartmentCategory } from './config';
import { TeamMember, Ticket } from './types';

/**
 * Assigns an incoming ticket to an active department team member.
 * Logic:
 * 1. Filter members for the target department.
 * 2. Exclude members flagged out_of_office.
 * 3. If all members are out of office, fall back to the designated department team lead.
 * 4. Choose member with the least open/active tickets.
 * 5. If category is 'Other' or department has no members, return null (routes to Triage).
 */
export function routeToAssignee(
  category: DepartmentCategory,
  allTeamMembers: TeamMember[],
  allTickets: Ticket[]
): {
  assignee: TeamMember | null;
  routingReason: string;
} {
  if (category === 'Other') {
    return {
      assignee: null,
      routingReason: 'Category is Other. Routed to Unassigned Human Triage queue.',
    };
  }

  // Filter department members
  const deptMembers = allTeamMembers.filter((m) => m.department === category);
  if (deptMembers.length === 0) {
    return {
      assignee: null,
      routingReason: `No team members registered for department ${category}. Sent to Triage.`,
    };
  }

  // Count open/active tickets per team member
  const loadMap = new Map<string, number>();
  deptMembers.forEach((m) => loadMap.set(m.id, 0));

  allTickets.forEach((t) => {
    if (t.assignee_id && (t.status === 'open' || t.status === 'active')) {
      if (loadMap.has(t.assignee_id)) {
        loadMap.set(t.assignee_id, (loadMap.get(t.assignee_id) || 0) + 1);
      }
    }
  });

  // Filter available (not out of office)
  const availableMembers = deptMembers.filter((m) => !m.out_of_office);

  if (availableMembers.length === 0) {
    // All out of office! Fall back to team lead
    const lead = deptMembers.find((m) => m.is_team_lead) || deptMembers[0];
    return {
      assignee: lead,
      routingReason: `All active agents are out-of-office. Escalated fallback to Team Lead ${lead.name}.`,
    };
  }

  // Find member with lowest active ticket load
  let lowestLoad = Infinity;
  let bestCandidate: TeamMember = availableMembers[0];

  for (const member of availableMembers) {
    const count = loadMap.get(member.id) || 0;
    if (count < lowestLoad) {
      lowestLoad = count;
      bestCandidate = member;
    }
  }

  return {
    assignee: bestCandidate,
    routingReason: `Assigned to ${bestCandidate.name} (least open tickets: ${lowestLoad} active).`,
  };
}
