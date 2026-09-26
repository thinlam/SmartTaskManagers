import { useTranslation } from 'react-i18next';
import { EmptyState } from '@stm/ui';
import { useTasksContext } from '../../state/TasksContext';
import { QuickCaptureInput } from '../../components/QuickCaptureInput';
import { reportError } from '../../lib/reportError';
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
 * Persists for real since Phase 27 — SmartTask.Api/SQL Server, via
 * TasksContext's now-backend-backed useTasks().
 */
export function InboxPage() {
  const { t } = useTranslation();
  const { tasks, isLoading, addTask, completeTask, deleteTask, openEditDrawer } = useTasksContext();
  const inboxTasks = tasks.filter((task) => task.status === 'Inbox');

  function handleAdd(title: string) {
    addTask({ title, area: 'Personal' }).catch(reportError);
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">{t('inbox.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
          {t('inbox.title')}
        </h1>
        <p className="text-sm text-ink-secondary">{t('inbox.subtitle')}</p>
      </header>

      <QuickCaptureInput onAdd={handleAdd} />

      {inboxTasks.length === 0 ? (
        <EmptyState message={t('inbox.emptyState')} />
      ) : (
        <div className="flex flex-col gap-2">
          {inboxTasks.map((task) => (
            <InboxTaskRow
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
