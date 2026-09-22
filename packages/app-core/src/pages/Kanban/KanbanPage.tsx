import { useMemo } from 'react';
import type { Task } from '@stm/types';
import { computeKanbanBoardData } from '@stm/shared';
import { StatCard } from '@stm/ui';
import { Sparkles } from 'lucide-react';
import { useTasksContext } from '../../state/TasksContext';
import { useProjectsContext } from '../../state/ProjectsContext';
import { KanbanLane } from './KanbanLane';

/**
 * Ported from computeKanbanData_()/writeKanbanKpis_()/writeKanbanHeader_()
 * in apps/google-sheets/src/11_Kanban.gs — same 4 KPIs (Open Tasks/Due
 * Today/Overdue/Completed), same 5 lanes in TaskStatus order, same "Top
 * Focus" banner (highest-SmartScore open task). No new context/store:
 * Kanban only reads TasksContext (for tasks + the click-to-edit action,
 * same pattern as Calendar, Phase 16) and ProjectsContext (to resolve a
 * card's `projectId` into a name for its meta line — same cross-context
 * read Projects/Goals already established).
 */
export function KanbanPage() {
  const { tasks, openEditDrawer } = useTasksContext();
  const { projects } = useProjectsContext();

  const data = useMemo(() => computeKanbanBoardData(tasks), [tasks]);

  function handleSelectTask(task: Task) {
    openEditDrawer(task);
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">Kanban</h1>
        <p className="text-sm text-ink-secondary">
          Move intentionally. Keep active work small and finish before starting more.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Open Tasks"
          value={String(data.openCount)}
          sub="Across active workflow"
          tone="primary"
        />
        <StatCard
          label="Due Today"
          value={String(data.dueTodayCount)}
          sub={data.dueTodayCount > 0 ? 'Needs your attention' : 'Nothing due today'}
          tone={data.dueTodayCount > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Overdue"
          value={String(data.overdueCount)}
          sub={data.overdueCount > 0 ? 'Clean these up first' : 'All clear'}
          tone={data.overdueCount > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Completed"
          value={String(data.completedCount)}
          sub="Total finished tasks"
          tone="success"
        />
      </section>

      <div
        className={
          data.focusTask
            ? 'flex items-center gap-2 rounded-md border border-primary/30 bg-primary-light px-3 py-2 text-sm font-semibold text-primary'
            : 'flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm font-semibold text-success'
        }
      >
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
        {data.focusTask ? (
          <span>
            TOP FOCUS • {data.focusTask.title} • Score {data.focusTask.smartScore ?? 0}
            {data.focusTask.recommendedAction ? `  •  ${data.focusTask.recommendedAction}` : ''}
          </span>
        ) : (
          <span>No open tasks right now.</span>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {data.lanes.map((lane) => (
          <KanbanLane
            key={lane.status}
            lane={lane}
            today={data.today}
            projects={projects}
            onSelectTask={handleSelectTask}
          />
        ))}
      </div>
    </div>
  );
}
