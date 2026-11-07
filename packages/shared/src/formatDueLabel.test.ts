import { describe, expect, it } from 'vitest';
import { formatDateVi, formatDueLabel } from './formatDueLabel';

// Fixed Saturday, matches the fixed "Now" used elsewhere in this package's tests.
const REFERENCE_DATE = new Date(2026, 10, 7); // 2026-11-07 (Saturday)

describe('formatDueLabel', () => {
  it('reports overdue days for a past due date with no status info', () => {
    expect(formatDueLabel('2026-11-01', REFERENCE_DATE)).toBe('Quá hạn 6 ngày');
  });

  it('reports overdue days for a past due date on a task that is not Completed', () => {
    const result = formatDueLabel('2026-11-01', REFERENCE_DATE, undefined, {
      status: 'In Progress',
    });

    expect(result).toBe('Quá hạn 6 ngày');
  });

  it('never reports overdue for a Completed task, even with a due date long in the past', () => {
    const result = formatDueLabel('2026-11-01', REFERENCE_DATE, undefined, {
      status: 'Completed',
      completedDate: '2026-11-02',
    });

    expect(result).toBe('Hoàn thành ngày 02/11/2026');
  });

  it('falls back to the due date for a Completed task with no completedDate recorded', () => {
    const result = formatDueLabel('2026-11-01', REFERENCE_DATE, undefined, {
      status: 'Completed',
      completedDate: null,
    });

    expect(result).toBe('Hoàn thành ngày 01/11/2026');
  });

  it('reports "no due date" for a Completed task with neither date', () => {
    const result = formatDueLabel(null, REFERENCE_DATE, undefined, {
      status: 'Completed',
      completedDate: null,
    });

    expect(result).toBe('Chưa có hạn');
  });

  it('still reports due-today/due-tomorrow/due-in-N-days for non-Completed tasks', () => {
    expect(formatDueLabel('2026-11-07', REFERENCE_DATE)).toBe('Đến hạn hôm nay');
    expect(formatDueLabel('2026-11-08', REFERENCE_DATE)).toBe('Đến hạn ngày mai');
    expect(formatDueLabel('2026-11-10', REFERENCE_DATE)).toBe('Còn 3 ngày');
  });

  it('uses the translate function when provided, including for the Completed label', () => {
    const t = (key: string, options?: Record<string, unknown>) =>
      `${key}:${JSON.stringify(options)}`;

    const result = formatDueLabel('2026-11-01', REFERENCE_DATE, t, {
      status: 'Completed',
      completedDate: '2026-11-02',
    });

    expect(result).toBe('common.completedOn:{"date":"02/11/2026"}');
  });
});

describe('formatDateVi', () => {
  it('formats a date as dd/MM/yyyy, zero-padded', () => {
    expect(formatDateVi(new Date(2026, 0, 5))).toBe('05/01/2026');
    expect(formatDateVi(new Date(2026, 10, 7))).toBe('07/11/2026');
  });
});
