import { describe, expect, it } from 'vitest';
import { parseQuickCapture, type QuickCaptureProject } from './quickCapture';

const PROJECTS: QuickCaptureProject[] = [
  { id: 'p1', name: 'Website Redesign' },
  { id: 'p2', name: 'Q4 Marketing' },
];

// Fixed Saturday, matches the fixed "Now" the backend tests use — keeps
// weekday/relative-date assertions below reproducible.
const REFERENCE_DATE = new Date(2026, 10, 7); // 2026-11-07 (Saturday)

describe('parseQuickCapture', () => {
  it('passes plain text through untouched when nothing matches', () => {
    const result = parseQuickCapture('Buy milk', PROJECTS, REFERENCE_DATE);

    expect(result).toEqual({ title: 'Buy milk' });
  });

  it('extracts a #Project token by prefix match, case-insensitive, spaces collapsed', () => {
    const result = parseQuickCapture('Fix navbar #WebsiteRedesign', PROJECTS, REFERENCE_DATE);

    expect(result.projectId).toBe('p1');
    expect(result.projectName).toBe('Website Redesign');
    expect(result.title).toBe('Fix navbar');
  });

  it('does not set a project when the #token matches nothing', () => {
    const result = parseQuickCapture('Fix navbar #Nope', PROJECTS, REFERENCE_DATE);

    expect(result.projectId).toBeUndefined();
    // Unmatched tokens are left in the title as-is.
    expect(result.title).toBe('Fix navbar #Nope');
  });

  it.each([
    ['!critical', 'Critical'],
    ['!urgent', 'Urgent'],
    ['!high', 'High'],
    ['!medium', 'Medium'],
    ['!low', 'Low'],
    ['!HIGH', 'High'],
  ] as const)('extracts priority token %s as %s', (token, expected) => {
    const result = parseQuickCapture(`Ship release ${token}`, PROJECTS, REFERENCE_DATE);

    expect(result.priority).toBe(expected);
    expect(result.title).toBe('Ship release');
  });

  it('ignores an unrecognized !token (not a known priority alias)', () => {
    const result = parseQuickCapture('Ship release !asap', PROJECTS, REFERENCE_DATE);

    expect(result.priority).toBeUndefined();
    expect(result.title).toBe('Ship release !asap');
  });

  it('parses "today"', () => {
    const result = parseQuickCapture('Call mom today', PROJECTS, REFERENCE_DATE);

    expect(result.dueDate).toBe('2026-11-07');
    expect(result.title).toBe('Call mom');
  });

  it('parses "tomorrow"', () => {
    const result = parseQuickCapture('Call mom tomorrow', PROJECTS, REFERENCE_DATE);

    expect(result.dueDate).toBe('2026-11-08');
  });

  it('parses "next week" as +7 days', () => {
    const result = parseQuickCapture('Call mom next week', PROJECTS, REFERENCE_DATE);

    expect(result.dueDate).toBe('2026-11-14');
  });

  it('parses "in N days"', () => {
    const result = parseQuickCapture('Call mom in 3 days', PROJECTS, REFERENCE_DATE);

    expect(result.dueDate).toBe('2026-11-10');
    expect(result.title).toBe('Call mom');
  });

  it('parses a weekday name as the next occurrence strictly after today', () => {
    // Reference date is a Saturday — "friday" must roll to the *following*
    // Friday (6 days later), not today or a day in the past.
    const result = parseQuickCapture('Call mom friday', PROJECTS, REFERENCE_DATE);

    expect(result.dueDate).toBe('2026-11-13');
  });

  it('when several due-date phrases are present, checks tomorrow before today (fixed precedence, not string order)', () => {
    const result = parseQuickCapture('Call mom today or tomorrow', PROJECTS, REFERENCE_DATE);

    expect(result.dueDate).toBe('2026-11-08');
  });

  it('combines project, priority, and due date together, stripping all three', () => {
    const result = parseQuickCapture(
      'Fix navbar #WebsiteRedesign !high tomorrow',
      PROJECTS,
      REFERENCE_DATE,
    );

    expect(result).toMatchObject({
      title: 'Fix navbar',
      projectId: 'p1',
      projectName: 'Website Redesign',
      priority: 'High',
      dueDate: '2026-11-08',
    });
  });

  it('collapses the extra whitespace left behind after stripping tokens', () => {
    const result = parseQuickCapture('Fix   navbar   !high   tomorrow', PROJECTS, REFERENCE_DATE);

    expect(result.title).toBe('Fix navbar');
  });
});
