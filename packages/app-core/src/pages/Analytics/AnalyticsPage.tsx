import { useMemo } from 'react';
import {
  computeAnalyticsSummary,
  getAnalyticsInsights,
  getAreaProgress,
  getPriorityDistribution,
  getProjectProgressList,
  getWeeklyCompletionTrend,
} from '@stm/shared';
import { EmptyState, PriorityBadge, Progress, SmartInsightCard, StatCard } from '@stm/ui';
import { translatePriority } from '../../lib/enumLabels';
import { useTranslation } from 'react-i18next';
import { useTasksContext } from '../../state/TasksContext';
import { useProjectsContext } from '../../state/ProjectsContext';
import { WeeklyTrendChart } from './WeeklyTrendChart';

/**
 * No Sheets precedent to port — `15_Reports.gs` was specced
 * (`apps/google-sheets/docs/claude/MODULE_PROMPTS.md` §10) but never
 * actually built in the production Sheets app. Its own rules still
 * apply, since they're the only real requirement that exists: real data
 * only, no fabricated analytics, no team metrics. Every number here
 * comes straight from `useTasksContext()`/`useProjectsContext()` through
 * plain aggregation functions in `@stm/shared` (`analyticsMetrics.ts`) —
 * nothing scored or inferred like Smart Engine (Phase 29).
 */
export function AnalyticsPage() {
  const { t } = useTranslation();
  const { tasks } = useTasksContext();
  const { projects } = useProjectsContext();

  const summary = useMemo(() => computeAnalyticsSummary(tasks), [tasks]);
  const priorityDistribution = useMemo(() => getPriorityDistribution(tasks), [tasks]);
  const areaProgress = useMemo(() => getAreaProgress(tasks), [tasks]);
  const projectProgress = useMemo(() => getProjectProgressList(projects, tasks), [projects, tasks]);
  const weeklyTrend = useMemo(() => getWeeklyCompletionTrend(tasks), [tasks]);
  const insights = useMemo(
    () => getAnalyticsInsights(summary, areaProgress, priorityDistribution),
    [summary, areaProgress, priorityDistribution],
  );

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
            {t('analytics.title')}
          </h1>
          <p className="text-sm text-ink-secondary">{t('analytics.subtitle')}</p>
        </header>
        <EmptyState message={t('analytics.emptyState')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
          {t('analytics.title')}
        </h1>
        <p className="text-sm text-ink-secondary">{t('analytics.subtitle')}</p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t('analytics.statCompletionRate')}
          value={`${summary.completionRate}%`}
          sub={t('analytics.statCompletionRateSub', {
            completed: summary.completedTasks,
            total: summary.totalTasks,
          })}
          tone={summary.completionRate >= 50 ? 'success' : 'primary'}
        />
        <StatCard
          label={t('analytics.statCompletedTasks')}
          value={String(summary.completedTasks)}
          sub={t('analytics.statCompletedTasksSub')}
          tone="success"
        />
        <StatCard
          label={t('analytics.statOverdueRate')}
          value={`${summary.overdueRate}%`}
          sub={t('analytics.statOverdueRateSub', {
            overdue: summary.overdueTasks,
            open: summary.openTasks,
          })}
          tone={summary.overdueTasks > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label={t('analytics.statTotalTasks')}
          value={String(summary.totalTasks)}
          sub={t('analytics.statTotalTasksSub')}
          tone="primary"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-primary">
            {t('analytics.priorityDistribution')}
          </h2>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            {priorityDistribution.map((item) => (
              <div key={item.priority} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <PriorityBadge
                    priority={item.priority}
                    label={translatePriority(t, item.priority)}
                  />
                  <span className="text-ink-secondary">
                    {item.count} · {item.percentage}%
                  </span>
                </div>
                <Progress value={item.percentage} />
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-primary">
            {t('analytics.areaDistribution')}
          </h2>
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
            {areaProgress.length === 0 ? (
              <p className="text-sm text-ink-muted">{t('analytics.areaEmpty')}</p>
            ) : (
              areaProgress.map((item) => (
                <div key={item.area} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-primary">{item.area}</span>
                    <span className="text-ink-secondary">{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} />
                  <span className="text-xs text-ink-muted">
                    {t('analytics.areaStats', {
                      completed: item.completed,
                      open: item.open,
                      total: item.total,
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-primary">{t('analytics.weeklyTrend')}</h2>
          <p className="text-xs text-ink-muted">{t('analytics.weeklyTrendSub')}</p>
          <WeeklyTrendChart days={weeklyTrend} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-primary">
            {t('analytics.projectProgress')}
          </h2>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            {projectProgress.length === 0 ? (
              <p className="text-sm text-ink-muted">{t('analytics.projectEmpty')}</p>
            ) : (
              projectProgress.map((item) => (
                <div key={item.projectId} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-primary">{item.name}</span>
                    <span className="text-ink-secondary">{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} />
                  <span className="text-xs text-ink-muted">
                    {t('analytics.linkedTasks', { count: item.taskCount })}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink-primary">{t('analytics.insights')}</h2>
        <div className="flex flex-col gap-2">
          {insights.map((insight) => (
            <SmartInsightCard key={insight.text} tone={insight.tone}>
              {insight.text}
            </SmartInsightCard>
          ))}
        </div>
      </section>
    </div>
  );
}
