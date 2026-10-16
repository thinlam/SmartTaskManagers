import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { CheckCircle2, Sparkles } from 'lucide-react';
import {
  EmptyState,
  HelpButton,
  HourlyActivityChart,
  PriorityBadge,
  StatCard,
  StatusDonutChart,
  TaskCard,
} from '@stm/ui';
import {
  compareBySmartRank,
  computeTodayData,
  formatDueLabel,
  getPriorityDistribution,
  type TodayKpi,
} from '@stm/shared';
import { translatePriority, translateTaskStatus } from '../../lib/enumLabels';
import { useTasksContext } from '../../state/TasksContext';
import { useProjectsContext } from '../../state/ProjectsContext';
import { useSettingsContext } from '../../state/SettingsContext';
import { TaskListSection } from './TaskListSection';

/**
 * `packages/shared`'s computeTodayData() has no i18n access, so its
 * `label`/`sub` on each KPI are English fallbacks only — this builds the
 * real, translated text from `kpi.key` and the raw numeric fields it
 * also carries.
 */
function translateKpi(t: TFunction, kpi: TodayKpi): { label: string; sub: string } {
  switch (kpi.key) {
    case 'dueToday':
      return {
        label: t('today.kpiDueToday'),
        sub: t('common.highPriorityCount', { count: kpi.highPriorityCount ?? 0 }),
      };
    case 'overdue':
      return {
        label: t('today.kpiOverdue'),
        sub: (kpi.overdueCount ?? 0) > 0 ? t('common.needsAttention') : t('common.allClearShort'),
      };
    case 'inProgress':
      return { label: t('today.kpiInProgress'), sub: t('today.kpiInProgressSub') };
    case 'completed':
      return {
        label: t('today.kpiCompletedToday'),
        sub: t('today.kpiCompletedTodaySub', { rate: kpi.completionRate ?? 0 }),
      };
  }
}

/** "8 AM" / "1 PM" — a plain hour-of-day label, not locale-sensitive (matches the 12-hour format already used by formatTimeLabel in packages/shared). */
function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${period}`;
}

/**
 * Frame 04 (Today), redesigned per the user-supplied mockup: 4 status-
 * count KPIs (Due Today/Overdue/In Progress/Completed Today — matches
 * Dashboard's Frame 03 redesign pattern), a ranked "Today's Focus" list
 * (top 3 by Smart Score, each a real TaskCard with its own progress bar)
 * plus a smart-recommendation banner, a 2-column body (Due Today + In
 * Progress lists, Quick Wins below) next to a sidebar of Overdue/High
 * Priority/Completed Today panels, and two donuts (Today's Plan,
 * Active by Priority) plus a real Completed-by-Hour chart at the bottom.
 *
 * Adapted for this app's single-user scope: the mockup's "Owner" column
 * and team-wide filter tabs (All Projects/Priority/Status) don't apply
 * here (every task already belongs to the signed-in user) — projects
 * show in place of an owner, and the "Recommended Tasks" sidebar panel
 * was dropped rather than duplicating Today's Focus with fabricated
 * action labels the Smart Engine doesn't actually produce.
 */
export function TodayPage() {
  const { t, i18n } = useTranslation();
  const { tasks, isLoading } = useTasksContext();
  const { projects } = useProjectsContext();
  const { settings } = useSettingsContext();
  const data = useMemo(
    () =>
      computeTodayData(tasks, new Date(), t, {
        smartScoreEnabled: settings.smartScoreEnabled,
        explainRecommendations: settings.explainRecommendations,
      }),
    [tasks, t, settings],
  );

  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  function metaFor(area: string, projectId?: string): string {
    const projectName = projectId ? projectNameById.get(projectId) : undefined;
    return projectName ? `${projectName} · ${area}` : area;
  }

  const inProgressTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status === 'In Progress')
        .sort((a, b) => compareBySmartRank(a, b, settings.smartScoreEnabled))
        .slice(0, 6),
    [tasks, settings.smartScoreEnabled],
  );

  const activePriorityDistribution = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== 'Completed');
    return getPriorityDistribution(openTasks)
      .filter((item) => item.count > 0)
      .map((item) => ({
        key: item.priority,
        label: translatePriority(t, item.priority),
        color: `var(--color-priority-${item.priority.toLowerCase()})`,
        count: item.count,
        percentage: item.percentage,
      }));
  }, [tasks, t]);

  const activeTaskCount = activePriorityDistribution.reduce((sum, item) => sum + item.count, 0);

  const todaysPlanData = useMemo(() => {
    const remaining = Math.max(data.review.plannedCount - data.review.completedCount, 0);
    const pct = (count: number) =>
      data.review.plannedCount > 0 ? Math.round((count / data.review.plannedCount) * 100) : 0;
    return [
      {
        key: 'completed',
        label: t('today.completedLegend'),
        color: 'var(--color-status-completed)',
        count: data.review.completedCount,
        percentage: pct(data.review.completedCount),
      },
      {
        key: 'remaining',
        label: t('today.remainingLegend'),
        color: 'var(--color-primary-light)',
        count: remaining,
        percentage: pct(remaining),
      },
    ];
  }, [data.review, t]);

  const hourlyActivityData = useMemo(
    () =>
      data.hourlyActivity.map((entry) => ({
        label: formatHourLabel(entry.hour),
        completedCount: entry.completedCount,
        scheduledCount: entry.scheduledCount,
      })),
    [data.hourlyActivity],
  );

  const lastUpdatedLabel = new Date().toLocaleTimeString(i18n.language, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const dateLabel = new Date().toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">{t('today.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
              {t('today.title')}
            </h1>
            <HelpButton
              title={t('help.today.title')}
              intro={t('help.today.intro')}
              items={t('help.today.items', { returnObjects: true }) as string[]}
              closeLabel={t('common.close')}
            />
          </div>
          <p className="text-sm text-ink-secondary">
            {dateLabel} · {t('today.subtitle')}
          </p>
        </div>
        <span className="text-xs text-ink-muted">
          {t('today.lastUpdatedLabel', { time: lastUpdatedLabel })}
        </span>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {data.kpis.map((kpi) => {
          const { label, sub } = translateKpi(t, kpi);
          return (
            <StatCard
              key={kpi.key}
              label={label}
              value={kpi.value}
              sub={sub}
              tone={kpi.tone}
              emphasize={kpi.emphasize}
            />
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink-primary">{t('today.todaysFocus')}</h2>
        {data.topFocus.length === 0 ? (
          <EmptyState message={t('today.allClear')} />
        ) : (
          <div className="flex flex-col gap-2">
            {data.topFocus.map((task, index) => (
              <div key={task.id} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <TaskCard
                    title={task.title}
                    meta={metaFor(task.area, task.projectId)}
                    dueLabel={task.dueLabel}
                    priority={task.priority}
                    priorityLabel={translatePriority(t, task.priority)}
                    progress={task.progress}
                    smartScore={task.smartScore}
                    recommendedAction={task.recommendedAction}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        {data.bestNext && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary-light/40 px-4 py-3 text-sm text-primary">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {t('today.smartRecommendation', {
                title: data.bestNext.title,
                defaultValue: `Smart recommendation: Start "${data.bestNext.title}" now — highest priority and deadline impact.`,
              })}
            </span>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <TaskListSection
              title={t('today.scheduled')}
              subtitle={t('today.scheduledSubtitle')}
              tasks={data.scheduled.tasks}
              emptyText={t('today.scheduledEmpty')}
              accent="info"
            />

            <section className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                  <h2 className="text-lg font-semibold text-ink-primary">
                    {t('today.inProgressSectionTitle')}
                  </h2>
                </div>
                <p className="text-xs text-ink-muted">{t('today.inProgressSectionSubtitle')}</p>
              </div>
              {inProgressTasks.length === 0 ? (
                <EmptyState message={t('today.noInProgressTasks')} />
              ) : (
                <div className="flex flex-col gap-2">
                  {inProgressTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      title={task.title}
                      meta={metaFor(task.area, task.projectId ?? undefined)}
                      dueLabel={formatDueLabel(task.dueDate, new Date(), t)}
                      priority={task.priority}
                      priorityLabel={translatePriority(t, task.priority)}
                      status={task.status}
                      statusLabel={translateTaskStatus(t, task.status)}
                      progress={task.progress}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          <TaskListSection
            title={t('today.quickWins')}
            subtitle={t('today.quickWinsSubtitle')}
            tasks={data.quickWins.tasks}
            emptyText={t('today.quickWinsEmpty')}
            accent="success"
          />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-1">
          <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink-primary">
              {t('today.overduePanelTitle')}
            </h2>
            {data.overdueTasks.length === 0 ? (
              <EmptyState message={t('today.noOverdueTasks')} className="border-none" />
            ) : (
              <ul className="flex flex-col gap-3">
                {data.overdueTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-col gap-1 border-l-2 border-danger pl-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-ink-primary">{task.title}</span>
                      <PriorityBadge priority={task.priority} label={translatePriority(t, task.priority)} />
                    </div>
                    <span className="text-xs text-ink-secondary">
                      {metaFor(task.area, task.projectId)}
                    </span>
                    <span className="text-xs font-medium text-danger">{task.dueLabel}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink-primary">
              {t('today.highPriorityTitle')}
            </h2>
            {data.highPriorityTasks.length === 0 ? (
              <EmptyState message={t('today.noHighPriorityTasks')} className="border-none" />
            ) : (
              <ul className="flex flex-col gap-3">
                {data.highPriorityTasks.map((task) => (
                  <li key={task.id} className="flex flex-col gap-1 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-ink-primary">{task.title}</span>
                      <PriorityBadge priority={task.priority} label={translatePriority(t, task.priority)} />
                    </div>
                    <span className="text-xs text-ink-secondary">
                      {metaFor(task.area, task.projectId)} · {task.dueLabel}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink-primary">
              {t('today.completedTodayTitle')}
            </h2>
            {data.completedToday.length === 0 ? (
              <EmptyState message={t('today.noCompletedToday')} className="border-none" />
            ) : (
              <ul className="flex flex-col gap-3">
                {data.completedToday.map((task) => (
                  <li key={task.id} className="flex items-start gap-2 text-sm">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-ink-primary">{task.title}</span>
                      <span className="text-xs text-ink-muted">
                        {t('today.completedAtLabel', {
                          time: new Date(task.completedAtIso).toLocaleTimeString(i18n.language, {
                            hour: 'numeric',
                            minute: '2-digit',
                          }),
                        })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink-primary">{t('today.todaysPlanTitle')}</h2>
          {data.review.plannedCount === 0 ? (
            <EmptyState message={t('today.noPlannedTasks')} className="border-none" />
          ) : (
            <StatusDonutChart
              data={todaysPlanData}
              centerValue={`${data.review.completionRate}%`}
              centerLabel={t('today.donePct')}
            />
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink-primary">
            {t('today.activeByPriorityTitle')}
          </h2>
          {activePriorityDistribution.length === 0 ? (
            <EmptyState message={t('today.noActiveTasks')} className="border-none" />
          ) : (
            <StatusDonutChart
              data={activePriorityDistribution}
              centerValue={String(activeTaskCount)}
              centerLabel={t('today.activeCenterLabel')}
            />
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink-primary">
          {t('today.completedByHourTitle')}
        </h2>
        {hourlyActivityData.length === 0 ? (
          <EmptyState message={t('today.noHourlyActivity')} className="border-none" />
        ) : (
          <HourlyActivityChart
            data={hourlyActivityData}
            completedLabel={t('today.completedLegend')}
            scheduledLabel={t('today.remainingScheduledLegend')}
          />
        )}
      </section>
    </div>
  );
}
