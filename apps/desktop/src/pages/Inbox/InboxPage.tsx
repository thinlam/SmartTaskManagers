import { EmptyState } from '@stm/ui';
import { useTasksContext } from '../../state/TasksContext';
import { QuickCaptureInput } from '../../components/QuickCaptureInput';
import { InboxTaskRow } from './InboxTaskRow';

/**
 * Inbox has no Canva frame or Google Sheets view to mirror — it's a new
 * screen from the original roadmap's information architecture, built on
 * a real part of the data model: Status = 'Inbox' is already the default
 * status Quick Add assigns (apps/google-sheets/src/10_QuickAdd.gs).
 *
 * Reads the shared TasksContext (Phase 12, step 2) — Inbox used to keep
 * its own separate mock task list (Phase 11), which meant completing a
 * task here didn't show up anywhere else and vice versa: two
 * disconnected "your tasks" lists in one running app. Now Inbox is just
 * tasks filtered to status === 'Inbox' from the same store Tasks (Phase
 * 12) and Topbar's "+ New Task" write to.
 *
 * None of it persists past a reload: there is no backend yet (Phase 27)
 * and this intentionally doesn't reach for localStorage as a substitute,
 * to avoid the false impression that anything is actually saved.
 */
export function InboxPage() {
  const { tasks, addTask, completeTask, deleteTask, openEditDrawer } = useTasksContext();
  const inboxTasks = tasks.filter((task) => task.status === 'Inbox');

  function handleAdd(title: string) {
    addTask({ title, area: 'Personal' });
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">Inbox</h1>
        <p className="text-sm text-ink-secondary">
          Quick-captured tasks waiting to be organized into an area or project.
        </p>
      </header>

      <QuickCaptureInput onAdd={handleAdd} />

      {inboxTasks.length === 0 ? (
        <EmptyState message="Your inbox is empty. Capture a task above to get started." />
      ) : (
        <div className="flex flex-col gap-2">
          {inboxTasks.map((task) => (
            <InboxTaskRow
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
