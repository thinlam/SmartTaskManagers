import { useMemo } from 'react';
import { computeSmartAssistantData } from '@stm/shared';
import { EmptyState, ProjectHealthBadge, RiskBadge, StatCard, TaskCard } from '@stm/ui';
import { useTasksContext } from '../../state/TasksContext';
import { useProjectsContext } from '../../state/ProjectsContext';
import { useGoalsContext } from '../../state/GoalsContext';
import { useHabitsContext } from '../../state/HabitsContext';

/**
 * No Sheets precedent — this route existed as a nav placeholder since
 * Phase 04 ("Phase 29+ (Smart Engine)"), never built. Scope confirmed
 * with the user: a real rule-based recommendation page, not a chat/LLM
 * assistant (that needs real AI integration — a separate, much bigger
 * decision this app hasn't made). Every number/group here comes from
 * computeSmartAssistantData() (@stm/shared) reading real Task/Project/
 * Goal/Habit data — see that file's doc comment for the exact rules.
 */
export function SmartAssistantPage() {
  const { tasks, isLoading: tasksLoading } = useTasksContext();
  const { projects, isLoading: projectsLoading } = useProjectsContext();
  const { goals, isLoading: goalsLoading } = useGoalsContext();
  const { habits, isLoading: habitsLoading } = useHabitsContext();

  const data = useMemo(
    () => computeSmartAssistantData(tasks, projects, goals, habits),
    [tasks, projects, goals, habits],
  );

  const isLoading = tasksLoading || projectsLoading || goalsLoading || habitsLoading;

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">Loading assistant…</div>;
  }

  const hasNothing =
    data.criticalTasks.length === 0 &&
    data.actionGroups.length === 0 &&
    data.projectAlerts.length === 0 &&
    data.goalAlerts.length === 0 &&
    data.habitAlerts.length === 0;

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">Smart Assistant</h1>
        <p className="text-sm text-ink-secondary">{data.summary}</p>
      </header>

      {hasNothing ? (
        <EmptyState message="Nothing needs attention right now. Add some tasks to get recommendations." />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Critical Risk"
              value={String(data.riskCounts.Critical)}
              sub="Open tasks"
              tone="danger"
            />
            <StatCard
              label="High Risk"
              value={String(data.riskCounts.High)}
              sub="Open tasks"
              tone="warning"
            />
            <StatCard
              label="Medium Risk"
              value={String(data.riskCounts.Medium)}
              sub="Open tasks"
              tone="info"
            />
            <StatCard
              label="Low Risk"
              value={String(data.riskCounts.Low)}
              sub="Open tasks"
              tone="success"
            />
          </section>

          {data.criticalTasks.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-ink-primary">Needs Attention</h2>
              <div className="flex flex-col gap-2">
                {data.criticalTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <TaskCard
                        title={task.title}
                        meta={task.area}
                        dueLabel={task.dueLabel}
                        priority={task.priority}
                        smartScore={task.smartScore}
                      />
                    </div>
                    {task.risk && <RiskBadge risk={task.risk} />}
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.actionGroups.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-ink-primary">Recommended Actions</h2>
              {data.actionGroups.map((group) => (
                <div key={group.action} className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
                    {group.action} ({group.tasks.length})
                  </h3>
                  <div className="flex flex-col gap-2">
                    {group.tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        title={task.title}
                        meta={task.area}
                        dueLabel={task.dueLabel}
                        priority={task.priority}
                        smartScore={task.smartScore}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-ink-primary">Projects</h2>
              {data.projectAlerts.length === 0 ? (
                <EmptyState message="No projects need attention." />
              ) : (
                <div className="flex flex-col gap-3">
                  {data.projectAlerts.map((alert) => (
                    <div
                      key={alert.projectId}
                      className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-ink-primary">{alert.name}</span>
                        <ProjectHealthBadge health={alert.health} />
                      </div>
                      <span className="text-xs text-ink-secondary">{alert.nextAction}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-ink-primary">Goals</h2>
              {data.goalAlerts.length === 0 ? (
                <EmptyState message="No goals at risk." />
              ) : (
                <div className="flex flex-col gap-3">
                  {data.goalAlerts.map((alert) => (
                    <div
                      key={alert.goalId}
                      className="flex items-center justify-between rounded-lg border border-border bg-surface p-3"
                    >
                      <span className="text-sm font-medium text-ink-primary">{alert.name}</span>
                      <span className="text-xs text-ink-secondary">{alert.progress}% progress</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-ink-primary">Habits</h2>
              {data.habitAlerts.length === 0 ? (
                <EmptyState message="No streaks at risk." />
              ) : (
                <div className="flex flex-col gap-3">
                  {data.habitAlerts.map((alert) => (
                    <div
                      key={alert.habitId}
                      className="flex items-center justify-between rounded-lg border border-border bg-surface p-3"
                    >
                      <span className="text-sm font-medium text-ink-primary">{alert.name}</span>
                      <span className="text-xs text-ink-secondary">{alert.streak}-day streak</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
