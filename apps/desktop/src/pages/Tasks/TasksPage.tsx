import { useMemo, useState } from 'react';
import { EmptyState, StatCard } from '@stm/ui';
import { useTasksContext } from '../../state/TasksContext';
import { QuickCaptureInput } from '../../components/QuickCaptureInput';
import { TaskFilters, type PriorityFilter, type StatusFilter } from './TaskFilters';
import { TaskRow } from './TaskRow';

/**
 * Frame 05 (Tasks), adapted to Personal Mode — no Owner column (no
 * team). Summary counts mirror computeTaskCounts_() in
 * apps/google-sheets/src/08_Tasks.gs: Active = not Inbox and not
 * Completed (To Do/In Progress/Waiting combined), Overdue excludes
 * Completed tasks regardless of due date.
 *
 * Reads the shared TasksContext (Phase 12, step 2) instead of calling
 * useTasks() locally (step 1) — the task list here must be the same one
 * Topbar's "+ New Task" and Inbox write to, not a page-local copy that
 * resets on remount. Row actions: Complete/Delete (step 1) plus Edit
 * (step 2, opens TaskDetailDrawer for the full Area/Priority/Status/
 * dates/tags form).
 */
export function TasksPage() {
  const { tasks, deleteTask, completeTask, addTask, openEditDrawer } = useTasksContext();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [priority, setPriority] = useState<PriorityFilter>('All');

  const counts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let inbox = 0;
    let active = 0;
    let completed = 0;
    let overdue = 0;

    for (const task of tasks) {
      if (task.status === 'Inbox') inbox += 1;
      else if (task.status !== 'Completed') active += 1;

      if (task.status === 'Completed') {
        completed += 1;
      } else if (task.dueDate) {
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due.getTime() < today.getTime()) overdue += 1;
      }
    }

    return { inbox, active, completed, overdue };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (query && !task.title.toLowerCase().includes(query)) return false;
      if (status !== 'All' && task.status !== status) return false;
      if (priority !== 'All' && task.priority !== priority) return false;
      return true;
    });
  }, [tasks, search, status, priority]);

  function handleAdd(title: string) {
    addTask({ title, area: 'Personal' });
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">Tasks</h1>
        <p className="text-sm text-ink-secondary">
          Manage, prioritize and track every task from one place.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Inbox" value={String(counts.inbox)} sub="Not yet triaged" tone="primary" />
        <StatCard label="Active" value={String(counts.active)} sub="In flight" tone="info" />
        <StatCard
          label="Overdue"
          value={String(counts.overdue)}
          sub="Needs attention"
          tone="danger"
        />
        <StatCard
          label="Completed"
          value={String(counts.completed)}
          sub="All time"
          tone="success"
        />
      </section>

      <QuickCaptureInput onAdd={handleAdd} placeholder="Add a task… e.g. Draft quarterly review" />

      <TaskFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
      />

      {filteredTasks.length === 0 ? (
        <EmptyState
          message={
            tasks.length === 0
              ? 'No tasks yet. Add one above to get started.'
              : 'No tasks match the current search/filters.'
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={completeTask}
              onDelete={deleteTask}
              onEdit={openEditDrawer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
