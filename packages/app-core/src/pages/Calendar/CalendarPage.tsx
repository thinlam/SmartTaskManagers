import { useMemo, useState } from 'react';
import type { Task } from '@stm/types';
import { computeCalendarMonthData } from '@stm/shared';
import { Button, IconButton, StatCard } from '@stm/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTasksContext } from '../../state/TasksContext';
import { CalendarGrid } from './CalendarGrid';
import { CalendarAgenda } from './CalendarAgenda';

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

/**
 * Ported from computeCalendarData_()/writeCalendarKpis_() in
 * apps/google-sheets/src/12_Calendar.gs — same 4 KPIs (Scheduled/Due
 * Today/Overdue/Completed, all scoped to the viewed month), same
 * Monday-start 6-week grid, same overdue+upcoming agenda. The viewed
 * month (`anchor`) is page-local state, not a shared context — Sheets
 * persists it as a script Property scoped to the Calendar sheet only,
 * nothing else in the app reads or depends on which month is being
 * viewed.
 */
export function CalendarPage() {
  const { t } = useTranslation();
  const { tasks, openEditDrawer } = useTasksContext();
  const [anchor, setAnchor] = useState(() => new Date());

  const data = useMemo(() => computeCalendarMonthData(anchor, tasks), [anchor, tasks]);

  const monthLabel = anchor
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase();

  function handleSelectTask(task: Task) {
    openEditDrawer(task);
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
            {t('calendar.title')}
          </h1>
          <p className="text-sm text-ink-secondary">{t('calendar.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
            aria-label={t('calendar.prevMonthAriaLabel')}
            onClick={() => setAnchor((current) => addMonths(current, -1))}
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => setAnchor(new Date())}>
            {t('calendar.todayButton')}
          </Button>
          <IconButton
            icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
            aria-label={t('calendar.nextMonthAriaLabel')}
            onClick={() => setAnchor((current) => addMonths(current, 1))}
          />
          <span className="ml-2 text-sm font-bold text-primary">{monthLabel}</span>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t('calendar.statScheduled')}
          value={String(data.scheduledThisMonth.length)}
          sub={t('calendar.statScheduledSub')}
          tone="primary"
        />
        <StatCard
          label={t('calendar.statDueToday')}
          value={String(data.dueToday.length)}
          sub={
            data.dueToday.length > 0
              ? t('calendar.statDueTodaySubAttention')
              : t('calendar.statDueTodaySubNone')
          }
          tone={data.dueToday.length > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label={t('calendar.statOverdue')}
          value={String(data.overdue.length)}
          sub={
            data.overdue.length > 0
              ? t('calendar.statOverdueSubResolve')
              : t('calendar.statOverdueSubClear')
          }
          tone={data.overdue.length > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label={t('calendar.statCompleted')}
          value={String(data.completedThisMonth.length)}
          sub={t('calendar.statCompletedSub')}
          tone="success"
        />
      </section>

      <CalendarGrid data={data} onSelectTask={handleSelectTask} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink-primary">{t('calendar.agenda')}</h2>
        <CalendarAgenda tasks={data.agenda} onSelectTask={handleSelectTask} />
      </section>
    </div>
  );
}
