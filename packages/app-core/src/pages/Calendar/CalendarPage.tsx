import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task } from '@stm/types';
import {
  calendarDateKey,
  computeCalendarMonthData,
  getBusiestUpcomingDay,
  getUpcomingDeadlines,
  type CalendarDay,
} from '@stm/shared';
import { Button, EmptyState, HelpButton, IconButton, PriorityBadge, StatCard } from '@stm/ui';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTasksContext } from '../../state/TasksContext';
import { useProjectsContext } from '../../state/ProjectsContext';
import { translatePriority } from '../../lib/enumLabels';
import { CalendarGrid } from './CalendarGrid';
import { CalendarWeekGrid } from './CalendarWeekGrid';
import { CalendarAgenda } from './CalendarAgenda';

type ViewMode = 'month' | 'week' | 'agenda';

const controlClasses =
  'rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function formatTimeLabel(dueTime: string): string {
  const [hourStr, minuteStr] = dueTime.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

/**
 * Ported from computeCalendarData_()/writeCalendarKpis_() in
 * apps/google-sheets/src/12_Calendar.gs — same 4 KPIs (Scheduled/Due
 * Today/Overdue/Completed, all scoped to the viewed month), same
 * Monday-start 6-week grid, same overdue+upcoming agenda. Redesigned per
 * Frame 09: a Project filter (no Owner filter — single-user app), real
 * Month/Week/Agenda tabs, a right sidebar with a "Selected Day" panel
 * (click any day to see its tasks), an "Upcoming deadlines" panel (next
 * 7 days), and a Smart insight line — both built from
 * getUpcomingDeadlines()/getBusiestUpcomingDay() (@stm/shared), real
 * counts over real due dates, not a canned sentence.
 */
export function CalendarPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { tasks } = useTasksContext();
  const { projects } = useProjectsContext();
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => calendarDateKey(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [projectFilter, setProjectFilter] = useState('All');

  const filteredTasks = useMemo(
    () => (projectFilter === 'All' ? tasks : tasks.filter((task) => task.projectId === projectFilter)),
    [tasks, projectFilter],
  );

  const data = useMemo(() => computeCalendarMonthData(anchor, filteredTasks), [anchor, filteredTasks]);

  const monthLabel = anchor
    .toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })
    .toUpperCase();

  const selectedDay: CalendarDay | undefined = data.days.find(
    (day) => day.dateKey === selectedDateKey,
  );

  const completedOnSelectedDay = useMemo(
    () =>
      filteredTasks.filter(
        (task) =>
          task.status === 'Completed' &&
          task.completedDate &&
          calendarDateKey(new Date(task.completedDate)) === selectedDateKey,
      ),
    [filteredTasks, selectedDateKey],
  );

  const weekDays = useMemo(() => {
    const index = data.days.findIndex((day) => day.dateKey === selectedDateKey);
    const weekStart = index === -1 ? 0 : index - (index % 7);
    return data.days.slice(weekStart, weekStart + 7);
  }, [data.days, selectedDateKey]);

  const upcomingDeadlines = useMemo(
    () => getUpcomingDeadlines(filteredTasks, new Date(), 7),
    [filteredTasks],
  );
  const busiestDay = useMemo(() => getBusiestUpcomingDay(upcomingDeadlines), [upcomingDeadlines]);

  function handleSelectTask(task: Task) {
    navigate(`/tasks/${task.id}`);
  }

  function handleSelectDay(day: CalendarDay) {
    setSelectedDateKey(day.dateKey);
  }

  const selectedDayLabel = selectedDay
    ? selectedDay.date.toLocaleDateString(i18n.language, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : '';

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
              {t('calendar.title')}
            </h1>
            <HelpButton
              title={t('help.calendar.title')}
              intro={t('help.calendar.intro')}
              items={t('help.calendar.items', { returnObjects: true }) as string[]}
              closeLabel={t('common.close')}
            />
          </div>
          <p className="text-sm text-ink-secondary">{t('calendar.subtitle')}</p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <IconButton
                icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
                aria-label={t('calendar.prevMonthAriaLabel')}
                onClick={() => setAnchor((current) => addMonths(current, -1))}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  setAnchor(now);
                  setSelectedDateKey(calendarDateKey(now));
                }}
              >
                {t('calendar.todayButton')}
              </Button>
              <IconButton
                icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
                aria-label={t('calendar.nextMonthAriaLabel')}
                onClick={() => setAnchor((current) => addMonths(current, 1))}
              />
              <span className="ml-1 text-sm font-bold text-primary">{monthLabel}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                aria-label={t('tasks.projectFilterAriaLabel')}
                className={controlClasses}
              >
                <option value="All">{t('kanban.filterProjectAll')}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <div className="flex rounded-md border border-border p-0.5">
                {(['month', 'week', 'agenda'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      viewMode === mode
                        ? 'bg-primary text-white'
                        : 'text-ink-secondary hover:bg-surface-secondary'
                    }`}
                  >
                    {t(`calendar.view${mode.charAt(0).toUpperCase()}${mode.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {viewMode === 'month' && (
            <CalendarGrid
              data={data}
              selectedDateKey={selectedDateKey}
              onSelectDay={handleSelectDay}
              onSelectTask={handleSelectTask}
            />
          )}
          {viewMode === 'week' && (
            <CalendarWeekGrid
              weekDays={weekDays}
              today={data.today}
              selectedDateKey={selectedDateKey}
              onSelectDay={handleSelectDay}
              onSelectTask={handleSelectTask}
            />
          )}
          {viewMode === 'agenda' && (
            <CalendarAgenda tasks={data.agenda} onSelectTask={handleSelectTask} />
          )}

          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
              {t('calendar.legendOverdue')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
              {t('calendar.legendDueToday')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
              {t('calendar.legendHighCritical')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
              {t('calendar.legendCompleted')}
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-1">
          <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t('calendar.selectedDayLabel')}
              </span>
              {selectedDay?.isToday && (
                <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  {t('calendar.todayBadge')}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold capitalize text-ink-primary">{selectedDayLabel}</h2>
            <p className="text-xs text-ink-secondary">
              {t('calendar.selectedDaySummary', {
                due: selectedDay?.tasks.length ?? 0,
                completed: completedOnSelectedDay.length,
              })}
            </p>

            {(selectedDay?.tasks.length ?? 0) === 0 ? (
              <EmptyState message={t('calendar.selectedDayEmpty')} className="border-none" />
            ) : (
              <ul className="flex flex-col gap-3">
                {selectedDay!.tasks.map((task) => {
                  const project = task.projectId
                    ? projects.find((p) => p.id === task.projectId)
                    : undefined;
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectTask(task)}
                        className="flex w-full flex-col gap-0.5 text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-ink-primary">{task.title}</span>
                          <PriorityBadge
                            priority={task.priority}
                            label={translatePriority(t, task.priority)}
                          />
                        </div>
                        <span className="text-xs text-ink-muted">
                          {task.dueTime ? `${formatTimeLabel(task.dueTime)} · ` : ''}
                          {[project?.name, task.area].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              onClick={() => navigate('/today')}
              className="text-left text-sm font-medium text-primary hover:underline"
            >
              {t('calendar.openFullTodayView')} →
            </button>
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-primary">
                {t('calendar.upcomingDeadlinesTitle')}
              </h2>
              <span className="text-xs text-ink-muted">{t('calendar.next7Days')}</span>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <EmptyState message={t('calendar.noUpcomingDeadlines')} className="border-none" />
            ) : (
              <ul className="flex flex-col gap-3">
                {upcomingDeadlines.slice(0, 8).map(({ task, date }) => {
                  const project = task.projectId
                    ? projects.find((p) => p.id === task.projectId)
                    : undefined;
                  return (
                    <li key={task.id} className="flex items-start gap-3">
                      <span className="flex min-w-[52px] shrink-0 flex-col items-center rounded-md border border-border px-2 py-1 text-center">
                        <span className="text-[10px] font-semibold uppercase text-ink-muted">
                          {date.toLocaleDateString(i18n.language, { weekday: 'short' })}
                        </span>
                        <span className="text-sm font-bold text-ink-primary">{date.getDate()}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectTask(task)}
                        className="flex-1 text-left"
                      >
                        <span className="block text-sm font-medium text-ink-primary">
                          {task.title}
                        </span>
                        <span className="text-xs text-ink-muted">
                          {[project?.name, translatePriority(t, task.priority)]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {busiestDay && (
              <div className="mt-1 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary-light/40 px-3 py-2.5 text-xs text-primary">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {t(
                    busiestDay.highPriorityCount > 0
                      ? 'calendar.smartInsightTextHighPriority'
                      : 'calendar.smartInsightTextPlain',
                    {
                      day: busiestDay.date.toLocaleDateString(i18n.language, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      }),
                      count: busiestDay.count,
                      highCount: busiestDay.highPriorityCount,
                    },
                  )}
                </span>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
