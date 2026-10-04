import type { Priority, Project } from '@stm/types';

export interface QuickCaptureProject {
  id: string;
  name: string;
}

export interface ParsedQuickCapture {
  /** The input with every matched token/phrase stripped out and whitespace collapsed. */
  title: string;
  projectId?: string;
  projectName?: string;
  priority?: Priority;
  /** YYYY-MM-DD. */
  dueDate?: string;
}

const PRIORITY_ALIASES: Record<string, Priority> = {
  critical: 'Critical',
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const WEEKDAYS = [
  ['sunday', 'sun'],
  ['monday', 'mon'],
  ['tuesday', 'tue'],
  ['wednesday', 'wed'],
  ['thursday', 'thu'],
  ['friday', 'fri'],
  ['saturday', 'sat'],
];

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Next occurrence of `targetDay` (0=Sun..6=Sat) strictly after today. */
function nextWeekday(today: Date, targetDay: number): Date {
  const diff = ((targetDay - today.getDay() + 7) % 7) || 7;
  return addDays(today, diff);
}

/**
 * A plain, rule-based parser for Quick Capture's "type naturally" syntax
 * (Frame 10.1.1) — no AI/LLM call, matching the mockup's own "Rule-based
 * · no AI used" label. Recognizes:
 *   #ProjectToken   — matched against real project names (case-
 *                     insensitive prefix match on the token with spaces
 *                     collapsed, e.g. "#WebsiteRedesign" matches
 *                     "Website Redesign")
 *   !priority       — critical/urgent/high/medium/low (any case)
 *   today / tomorrow / next week / in N day(s) / a weekday name
 *                   — a single due-date phrase (first match wins)
 * Everything matched is stripped from the returned `title`; unmatched
 * text passes through unchanged. No "@owner" support — this app has no
 * team/owner concept (single-user), so that mockup token doesn't apply.
 */
export function parseQuickCapture(
  input: string,
  projects: QuickCaptureProject[] | Project[],
  referenceDate: Date = new Date(),
): ParsedQuickCapture {
  let text = input;
  const result: ParsedQuickCapture = { title: input.trim() };

  const projectMatch = text.match(/#(\S+)/);
  if (projectMatch?.[1]) {
    const token = projectMatch[1].toLowerCase();
    const project = projects.find((p) => {
      const normalized = p.name.toLowerCase().replace(/\s+/g, '');
      return normalized === token || normalized.startsWith(token) || token.startsWith(normalized);
    });
    if (project) {
      result.projectId = project.id;
      result.projectName = project.name;
      text = text.replace(projectMatch[0], ' ');
    }
  }

  const priorityMatch = text.match(/!(\w+)/);
  if (priorityMatch?.[1]) {
    const priority = PRIORITY_ALIASES[priorityMatch[1].toLowerCase()];
    if (priority) {
      result.priority = priority;
      text = text.replace(priorityMatch[0], ' ');
    }
  }

  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const lower = text.toLowerCase();

  const inDaysMatch = lower.match(/\bin (\d+) days?\b/);
  const weekdayMatch = WEEKDAYS.flatMap(([full, short]) => [full, short]).find((name) =>
    new RegExp(`\\b${name}\\b`).test(lower),
  );

  if (/\btomorrow\b/.test(lower)) {
    result.dueDate = toIsoDate(addDays(today, 1));
    text = text.replace(/\btomorrow\b/i, ' ');
  } else if (/\bnext week\b/.test(lower)) {
    result.dueDate = toIsoDate(addDays(today, 7));
    text = text.replace(/\bnext week\b/i, ' ');
  } else if (/\btoday\b/.test(lower)) {
    result.dueDate = toIsoDate(today);
    text = text.replace(/\btoday\b/i, ' ');
  } else if (inDaysMatch) {
    result.dueDate = toIsoDate(addDays(today, Number(inDaysMatch[1])));
    text = text.replace(inDaysMatch[0], ' ');
  } else if (weekdayMatch) {
    const targetDay = WEEKDAYS.findIndex(([full, short]) => full === weekdayMatch || short === weekdayMatch);
    result.dueDate = toIsoDate(nextWeekday(today, targetDay));
    text = text.replace(new RegExp(`\\b${weekdayMatch}\\b`, 'i'), ' ');
  }

  result.title = text.replace(/\s+/g, ' ').trim();
  return result;
}
