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
      <div className="flex flex-col gap-6 p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">Analytics</h1>
          <p className="text-sm text-ink-secondary">
            Personal productivity insights, built from your real tasks.
          </p>
        </header>
        <EmptyState message="No tasks yet — analytics will appear once you have some." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">Analytics</h1>
        <p className="text-sm text-ink-secondary">
          Personal productivity insights, built from your real tasks.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Completion Rate"
          value={`${summary.completionRate}%`}
          sub={`${summary.completedTasks} of ${summary.totalTasks} tasks`}
          tone={summary.completionRate >= 50 ? 'success' : 'primary'}
        />
        <StatCard
          label="Completed Tasks"
          value={String(summary.completedTasks)}
          sub="All time"
          tone="success"
        />
        <StatCard
          label="Overdue Rate"
          value={`${summary.overdueRate}%`}
          sub={`${summary.overdueTasks} of ${summary.openTasks} open`}
          tone={summary.overdueTasks > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Total Tasks"
          value={String(summary.totalTasks)}
          sub="All statuses"
          tone="primary"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-primary">Priority Distribution</h2>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            {priorityDistribution.map((item) => (
              <div key={item.priority} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <PriorityBadge priority={item.priority} />
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
          <h2 className="text-lg font-semibold text-ink-primary">Area Distribution</h2>
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
            {areaProgress.length === 0 ? (
              <p className="text-sm text-ink-muted">No tasks with an area yet.</p>
            ) : (
              areaProgress.map((item) => (
                <div key={item.area} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-primary">{item.area}</span>
                    <span className="text-ink-secondary">{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} />
                  <span className="text-xs text-ink-muted">
                    {item.completed} completed · {item.open} open · {item.total} total
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-primary">Weekly Trend</h2>
          <p className="text-xs text-ink-muted">Tasks completed each of the last 7 days.</p>
          <WeeklyTrendChart days={weeklyTrend} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-primary">Project Progress</h2>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            {projectProgress.length === 0 ? (
              <p className="text-sm text-ink-muted">No projects yet.</p>
            ) : (
              projectProgress.map((item) => (
                <div key={item.projectId} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-primary">{item.name}</span>
                    <span className="text-ink-secondary">{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} />
                  <span className="text-xs text-ink-muted">{item.taskCount} linked tasks</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink-primary">Insights</h2>
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
