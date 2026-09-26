import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, StatCard } from '@stm/ui';
import { useTasksContext } from '../../state/TasksContext';
import { QuickCaptureInput } from '../../components/QuickCaptureInput';
import { reportError } from '../../lib/reportError';
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
  const { t } = useTranslation();
  const { tasks, isLoading, deleteTask, completeTask, addTask, openEditDrawer } = useTasksContext();
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
    addTask({ title, area: 'Personal' }).catch(reportError);
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">{t('tasks.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
          {t('tasks.title')}
        </h1>
        <p className="text-sm text-ink-secondary">{t('tasks.subtitle')}</p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t('tasks.statInbox')}
          value={String(counts.inbox)}
          sub={t('tasks.statInboxSub')}
          tone="primary"
        />
        <StatCard
          label={t('tasks.statActive')}
          value={String(counts.active)}
          sub={t('tasks.statActiveSub')}
          tone="info"
        />
        <StatCard
          label={t('tasks.statOverdue')}
          value={String(counts.overdue)}
          sub={t('tasks.statOverdueSub')}
          tone="danger"
        />
        <StatCard
          label={t('tasks.statCompleted')}
          value={String(counts.completed)}
          sub={t('tasks.statCompletedSub')}
          tone="success"
        />
      </section>

      <QuickCaptureInput onAdd={handleAdd} placeholder={t('tasks.quickCapturePlaceholder')} />

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
          message={tasks.length === 0 ? t('tasks.emptyNoTasks') : t('tasks.emptyNoMatch')}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={(id) => completeTask(id).catch(reportError)}
              onDelete={(id) => deleteTask(id).catch(reportError)}
              onEdit={openEditDrawer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
