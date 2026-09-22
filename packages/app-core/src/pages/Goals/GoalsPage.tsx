import { useMemo } from 'react';
import { EmptyState, StatCard } from '@stm/ui';
import { useGoalsContext } from '../../state/GoalsContext';
import { useTasksContext } from '../../state/TasksContext';
import { QuickCaptureInput } from '../../components/QuickCaptureInput';
import { reportError } from '../../lib/reportError';
import { GoalRow } from './GoalRow';

/**
 * No Frame/Sheets view precedent for a dedicated Goals screen (same
 * situation as Inbox, Phase 11) — the underlying data model is real
 * (GOAL_HEADERS, createGoal_/getAllGoals_ in apps/google-sheets/src/
 * 00_Constants.gs + 03_Data.gs) but there's no computed-metrics view to
 * port like Projects had (14_Projects.gs). KPI row is a straightforward
 * rollup of the stored Status/Progress fields — no fabricated scoring.
 */
export function GoalsPage() {
  const { goals, isLoading, addGoal, deleteGoal, openEditDrawer } = useGoalsContext();
  const { tasks } = useTasksContext();

  const summary = useMemo(() => {
    if (goals.length === 0) {
      return { total: 0, onTrack: 0, atRisk: 0, avgProgress: 0 };
    }

    let onTrack = 0;
    let atRisk = 0;
    let progressSum = 0;

    for (const goal of goals) {
      if (goal.status === 'On Track') onTrack += 1;
      if (goal.status === 'At Risk') atRisk += 1;
      progressSum += goal.progress;
    }

    return {
      total: goals.length,
      onTrack,
      atRisk,
      avgProgress: Math.round(progressSum / goals.length),
    };
  }, [goals]);

  function handleAdd(name: string) {
    addGoal({ name, area: 'Personal' }).catch(reportError);
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">Loading goals…</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">Goals</h1>
        <p className="text-sm text-ink-secondary">
          Track personal goals and the progress you're making toward them.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Goals"
          value={String(summary.total)}
          sub="Personal goals"
          tone="primary"
        />
        <StatCard label="On Track" value={String(summary.onTrack)} sub="Going well" tone="info" />
        <StatCard
          label="At Risk"
          value={String(summary.atRisk)}
          sub={summary.atRisk > 0 ? 'Needs attention' : 'No goals at risk'}
          tone={summary.atRisk > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Avg Progress"
          value={`${summary.avgProgress}%`}
          sub="Across all goals"
          tone={
            summary.avgProgress >= 75
              ? 'success'
              : summary.avgProgress >= 45
                ? 'primary'
                : 'warning'
          }
        />
      </section>

      <QuickCaptureInput onAdd={handleAdd} placeholder="Add a goal… e.g. Read 12 books this year" />

      {goals.length === 0 ? (
        <EmptyState message="No goals yet. Add one above to get started." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {goals.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              allTasks={tasks}
              onEdit={openEditDrawer}
              onDelete={(id) => deleteGoal(id).catch(reportError)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
