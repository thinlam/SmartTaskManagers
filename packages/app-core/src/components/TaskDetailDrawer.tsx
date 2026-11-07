import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Area, Priority, Task, TaskStatus } from '@stm/types';
import { ApiError } from '@stm/api-client';
import { useTranslation } from 'react-i18next';
import { Button, cn, Drawer } from '@stm/ui';
import { useTasksContext } from '../state/TasksContext';
import { useProjectsContext } from '../state/ProjectsContext';
import { useGoalsContext } from '../state/GoalsContext';
import { translatePriority, translateTaskStatus } from '../lib/enumLabels';
import { reportError, reportSuccess } from '../lib/reportError';

const AREAS: Area[] = ['Career', 'Learning', 'Health', 'Personal', 'Personal Admin'];
const PRIORITIES: Priority[] = ['Critical', 'Urgent', 'High', 'Medium', 'Low'];
const STATUSES: TaskStatus[] = ['Inbox', 'To Do', 'In Progress', 'Waiting', 'Completed'];

const PRIORITY_DOT_CLASS: Record<Priority, string> = {
  Critical: 'bg-priority-critical',
  Urgent: 'bg-priority-urgent',
  High: 'bg-priority-high',
  Medium: 'bg-priority-medium',
  Low: 'bg-priority-low',
};

const PRIORITY_SELECTED_CLASS: Record<Priority, string> = {
  Critical: 'border-priority-critical bg-priority-critical/10 text-priority-critical',
  Urgent: 'border-priority-urgent bg-priority-urgent/10 text-priority-urgent',
  High: 'border-priority-high bg-priority-high/10 text-priority-high',
  Medium: 'border-priority-medium bg-priority-medium/10 text-priority-medium',
  Low: 'border-priority-low bg-priority-low/10 text-priority-low',
};

const STATUS_DOT_CLASS: Record<TaskStatus, string> = {
  Inbox: 'bg-status-inbox',
  'To Do': 'bg-status-to-do',
  'In Progress': 'bg-status-in-progress',
  Waiting: 'bg-status-waiting',
  Completed: 'bg-status-completed',
};

const STATUS_SELECTED_CLASS: Record<TaskStatus, string> = {
  Inbox: 'border-status-inbox bg-status-inbox/10 text-status-inbox',
  'To Do': 'border-status-to-do bg-status-to-do/10 text-status-to-do',
  'In Progress': 'border-status-in-progress bg-status-in-progress/10 text-status-in-progress',
  Waiting: 'border-status-waiting bg-status-waiting/10 text-status-waiting',
  Completed: 'border-status-completed bg-status-completed/10 text-status-completed',
};

const fieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';
const labelClasses = 'text-xs font-semibold uppercase tracking-wide text-ink-muted';

interface FormState {
  title: string;
  description: string;
  area: Area;
  /** '' = no project — matches the "No project" option's value. */
  projectId: string;
  /** '' = no goal — matches the "No goal" option's value. */
  goalId: string;
  priority: Priority;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  progress: number;
  tags: string;
  /** '' = no parent task — matches the "No parent" option's value. */
  parentTaskId: string;
  /** datetime-local input value ('' = no reminder). */
  reminderAt: string;
  attachmentUrl: string;
}

/** YYYY-MM-DDTHH:mm (local) for <input type="datetime-local">, or '' for null. */
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Inverse of toDatetimeLocalValue — '' becomes null, otherwise an ISO string. */
function fromDatetimeLocalValue(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function emptyForm(): FormState {
  return {
    title: '',
    description: '',
    area: 'Personal',
    projectId: '',
    goalId: '',
    priority: 'Medium',
    status: 'Inbox',
    startDate: '',
    dueDate: '',
    progress: 0,
    tags: '',
    parentTaskId: '',
    reminderAt: '',
    attachmentUrl: '',
  };
}

function formFromTask(task: Task): FormState {
  return {
    title: task.title,
    description: task.description,
    area: task.area,
    projectId: task.projectId ?? '',
    goalId: task.goalId ?? '',
    priority: task.priority,
    status: task.status,
    startDate: task.startDate ?? '',
    dueDate: task.dueDate ?? '',
    progress: task.progress,
    tags: task.tags.join(', '),
    parentTaskId: task.parentTaskId ?? '',
    reminderAt: toDatetimeLocalValue(task.reminderAt),
    attachmentUrl: task.attachmentUrl ?? '',
  };
}

/** YYYY-MM-DD for `today + offsetDays`, in local time (matches <input type="date">'s expected value format). */
function isoDateInDays(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * One form for both Create ("+ New Task" in Topbar, any page) and Edit
 * (row action on the Tasks list), switched on TasksContext's
 * editingTask (null = create). Rendered once in AppShell so it's
 * available from every route, not nested inside TasksPage.
 *
 * Redesigned per Frame 07 (Quick Add Task) for the create path: pill-
 * style Priority/Status pickers instead of <select>s, quick due-date
 * shortcuts, a live preview card, and an "Add & create another" action
 * (Ctrl+Enter) for capturing several tasks back to back. The mockup's
 * Owner field was dropped (single-user app — every task is already
 * "owned" by the signed-in user) and its "X of N required fields"
 * counter wasn't ported as-is: Title is this app's only actually
 * required field (Area/Priority/Status all have real defaults), so a
 * fabricated required-field count would misrepresent real validation.
 * The mockup's "calculated automatically after creation" note is kept
 * verbatim — Smart Score/Risk/Recommended Action genuinely are computed
 * server-side after save (Phase 29 Smart Engine), not before.
 *
 * Project field (Phase 13) and Goal field (Phase 14) each read their own
 * context directly — Projects, Goals and Tasks are separate providers,
 * all mounted in App.tsx, so this drawer can read from any of them
 * without the contexts needing to know about each other.
 */
export function TaskDetailDrawer() {
  const { t } = useTranslation();
  const {
    isDrawerOpen,
    editingTask,
    createDefaults,
    closeDrawer,
    addTask,
    updateTask,
    deleteTask,
    restoreTask,
    tasks,
  } = useTasksContext();
  const { projects } = useProjectsContext();
  const { goals } = useGoalsContext();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);

  /** Only top-level tasks can be chosen as a parent — subtasks are at most 2 levels deep. */
  const parentOptions = tasks.filter((task) => !task.parentTaskId && task.id !== editingTask?.id);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const nextForm = editingTask
      ? formFromTask(editingTask)
      : { ...emptyForm(), ...(createDefaults ?? {}) };
    setForm(nextForm);
    setError(null);
    setFieldErrors({});
    // Keep "Thêm chi tiết" open when editing a task that already has data
    // there, so existing values aren't hidden behind a collapsed section.
    setDetailsOpen(
      Boolean(
        nextForm.description ||
        nextForm.tags ||
        nextForm.startDate ||
        nextForm.reminderAt ||
        nextForm.attachmentUrl ||
        nextForm.goalId ||
        nextForm.parentTaskId ||
        nextForm.area !== 'Personal',
      ),
    );
  }, [isDrawerOpen, editingTask, createDefaults]);

  function fieldError(name: string): string | null {
    return fieldErrors[name]?.[0] ?? null;
  }

  /** Fields that live inside the collapsed "Thêm chi tiết" section — a validation error on any of them must force it open. */
  const DETAIL_ERROR_FIELDS = ['Tags', 'ParentTaskId', 'ReminderAt'];

  function applyFieldErrors(errors: Record<string, string[]>) {
    setFieldErrors(errors);
    if (DETAIL_ERROR_FIELDS.some((field) => field in errors)) {
      setDetailsOpen(true);
    }
  }

  function buildSharedFields() {
    const title = form.title.trim();
    const tags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    return {
      title,
      description: form.description,
      area: form.area,
      projectId: form.projectId || null,
      goalId: form.goalId || null,
      priority: form.priority,
      status: form.status,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
      progress: form.progress,
      tags,
      parentTaskId: form.parentTaskId || null,
      reminderAt: fromDatetimeLocalValue(form.reminderAt),
      attachmentUrl: form.attachmentUrl.trim() || null,
    };
  }

  /** Non-blocking: shown as a normal success toast with an added hint, never blocks save. */
  function successMessageFor(result: Task, baseMessage: string): string {
    return result.hasOpenDuplicateName
      ? `${baseMessage} ${t('tasks.titleDuplicateWarning')}`
      : baseMessage;
  }

  function applyError(err: unknown, fallback: string) {
    if (err instanceof ApiError && err.errors) {
      applyFieldErrors(err.errors);
      setError(err.message);
    } else {
      setFieldErrors({});
      setError(err instanceof ApiError ? err.message : fallback);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const shared = buildSharedFields();
    if (!shared.title) return;

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      if (editingTask) {
        const updated = await updateTask(editingTask.id, shared);
        reportSuccess(successMessageFor(updated, t('tasks.saveChangesButton')));
      } else {
        const created = await addTask(shared);
        reportSuccess(successMessageFor(created, t('tasks.addTaskButton')));
      }
      closeDrawer();
    } catch (err) {
      applyError(err, t('tasks.saveError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddAndCreateAnother() {
    const shared = buildSharedFields();
    if (!shared.title || editingTask) return;

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const created = await addTask(shared);
      reportSuccess(successMessageFor(created, t('tasks.addTaskButton')));
      setForm(emptyForm());
    } catch (err) {
      applyError(err, t('tasks.saveError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFormKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleAddAndCreateAnother().catch(() => undefined);
    }
  }

  async function handleDelete() {
    if (!editingTask) return;
    const deletedId = editingTask.id;
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteTask(deletedId);
      closeDrawer();
      reportSuccess(t('tasks.deleteSuccess'), {
        label: t('tasks.undoButton'),
        onClick: () => restoreTask(deletedId).catch(reportError),
      });
    } catch (err) {
      applyError(err, t('tasks.deleteError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isCreating = !editingTask;

  return (
    <Drawer
      open={isDrawerOpen}
      onClose={closeDrawer}
      size="lg"
      title={editingTask ? t('tasks.editTaskTitle') : t('tasks.newTaskTitle')}
      footer={
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            {editingTask ? (
              <Button type="button" variant="ghost" onClick={handleDelete} disabled={isSubmitting}>
                {t('tasks.deleteButton')}
              </Button>
            ) : (
              <span className="text-xs text-ink-muted">{t('tasks.quickAddFooterHint')}</span>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={closeDrawer}
                disabled={isSubmitting}
              >
                {t('tasks.cancelButton')}
              </Button>
              {isCreating && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddAndCreateAnother}
                  disabled={isSubmitting || !form.title.trim()}
                >
                  {t('tasks.addAndCreateAnotherButton')}
                </Button>
              )}
              <Button
                type="submit"
                form="task-detail-form"
                variant="primary"
                className="shadow-sm ring-1 ring-primary/30"
                disabled={isSubmitting || !form.title.trim()}
              >
                {editingTask ? t('tasks.saveChangesButton') : t('tasks.addTaskButton')}
              </Button>
            </div>
          </div>
        </div>
      }
    >
      <form
        id="task-detail-form"
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        className="flex flex-col gap-4"
      >
        {error && <p className="text-sm text-danger">{error}</p>}
        {editingTask?.hasOpenDuplicateName && (
          <p className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning">
            {t('tasks.titleDuplicateWarning')}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="task-title" className={labelClasses}>
            {t('tasks.fieldTitle')} *
          </label>
          <input
            id="task-title"
            type="text"
            required
            maxLength={200}
            autoFocus
            value={form.title}
            onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
            className={fieldClasses}
            placeholder={t('tasks.titlePlaceholder')}
          />
          {fieldError('Name') && <p className="text-xs text-danger">{fieldError('Name')}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <span className={labelClasses}>{t('tasks.fieldPriority')}</span>
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => setForm((f) => ({ ...f, priority }))}
                className={cn(
                  'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                  form.priority === priority
                    ? PRIORITY_SELECTED_CLASS[priority]
                    : 'border-border text-ink-secondary hover:bg-surface-secondary',
                )}
              >
                <span
                  className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT_CLASS[priority])}
                  aria-hidden="true"
                />
                {translatePriority(t, priority)}
              </button>
            ))}
          </div>
        </div>

        {!isCreating && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className={labelClasses}>{t('tasks.fieldStatus')}</span>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, status }))}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                      form.status === status
                        ? STATUS_SELECTED_CLASS[status]
                        : 'border-border text-ink-secondary hover:bg-surface-secondary',
                    )}
                  >
                    <span
                      className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT_CLASS[status])}
                      aria-hidden="true"
                    />
                    {translateTaskStatus(t, status)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="task-progress" className={labelClasses}>
                {t('tasks.fieldProgress', { progress: form.progress })}
              </label>
              <input
                id="task-progress"
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.progress}
                onChange={(event) =>
                  setForm((f) => ({ ...f, progress: Number(event.target.value) }))
                }
                className="w-full"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="task-due-date" className={labelClasses}>
            {t('tasks.fieldDueDate')}
          </label>
          <input
            id="task-due-date"
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm((f) => ({ ...f, dueDate: event.target.value }))}
            className={fieldClasses}
          />
          {fieldError('DueDate') && <p className="text-xs text-danger">{fieldError('DueDate')}</p>}
          <div className="mt-1 flex flex-wrap gap-2">
            {[
              { label: t('tasks.dueToday'), offset: 0 },
              { label: t('tasks.dueTomorrow'), offset: 1 },
              { label: t('tasks.duePlus3Days'), offset: 3 },
              { label: t('tasks.dueNextWeek'), offset: 7 },
            ].map((shortcut) => (
              <button
                key={shortcut.label}
                type="button"
                onClick={() => setForm((f) => ({ ...f, dueDate: isoDateInDays(shortcut.offset) }))}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-secondary hover:text-ink-primary"
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="task-project" className={labelClasses}>
            {t('tasks.fieldProject')}
          </label>
          <select
            id="task-project"
            value={form.projectId}
            onChange={(event) => setForm((f) => ({ ...f, projectId: event.target.value }))}
            className={fieldClasses}
          >
            <option value="">{t('tasks.noProjectOption')}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <details
          className="rounded-lg border border-border"
          open={detailsOpen}
          onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
        >
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-ink-primary">
            {t('tasks.sectionMoreDetails')}
          </summary>
          <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="task-description" className={labelClasses}>
                {t('tasks.fieldDescription')}
              </label>
              <textarea
                id="task-description"
                rows={3}
                value={form.description}
                onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
                className={fieldClasses}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="task-tags" className={labelClasses}>
                {t('tasks.fieldTags')}
              </label>
              <input
                id="task-tags"
                type="text"
                placeholder={t('tasks.tagsPlaceholder')}
                value={form.tags}
                onChange={(event) => setForm((f) => ({ ...f, tags: event.target.value }))}
                className={fieldClasses}
              />
              {fieldError('Tags') && <p className="text-xs text-danger">{fieldError('Tags')}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="task-start-date" className={labelClasses}>
                  {t('tasks.fieldStartDate')}
                </label>
                <input
                  id="task-start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm((f) => ({ ...f, startDate: event.target.value }))}
                  className={fieldClasses}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="task-reminder" className={labelClasses}>
                  {t('tasks.fieldReminderAt')}
                </label>
                <input
                  id="task-reminder"
                  type="datetime-local"
                  value={form.reminderAt}
                  onChange={(event) => setForm((f) => ({ ...f, reminderAt: event.target.value }))}
                  className={fieldClasses}
                />
                {fieldError('ReminderAt') && (
                  <p className="text-xs text-danger">{fieldError('ReminderAt')}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="task-attachment" className={labelClasses}>
                {t('tasks.fieldAttachmentUrl')}
              </label>
              <input
                id="task-attachment"
                type="url"
                placeholder={t('tasks.attachmentUrlPlaceholder')}
                value={form.attachmentUrl}
                onChange={(event) => setForm((f) => ({ ...f, attachmentUrl: event.target.value }))}
                className={fieldClasses}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="task-area" className={labelClasses}>
                  {t('tasks.fieldArea')}
                </label>
                <select
                  id="task-area"
                  value={form.area}
                  onChange={(event) => setForm((f) => ({ ...f, area: event.target.value as Area }))}
                  className={fieldClasses}
                >
                  {AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="task-goal" className={labelClasses}>
                  {t('tasks.fieldGoal')}
                </label>
                <select
                  id="task-goal"
                  value={form.goalId}
                  onChange={(event) => setForm((f) => ({ ...f, goalId: event.target.value }))}
                  className={fieldClasses}
                >
                  <option value="">{t('tasks.noGoalOption')}</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="task-parent" className={labelClasses}>
                {t('tasks.fieldParentTask')}
              </label>
              <select
                id="task-parent"
                value={form.parentTaskId}
                onChange={(event) => setForm((f) => ({ ...f, parentTaskId: event.target.value }))}
                className={fieldClasses}
              >
                <option value="">{t('tasks.noParentTaskOption')}</option>
                {parentOptions.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              {fieldError('ParentTaskId') && (
                <p className="text-xs text-danger">{fieldError('ParentTaskId')}</p>
              )}
            </div>
          </div>
        </details>

        {isCreating && (
          <p className="text-xs text-ink-muted">{t('tasks.calculatedAutomaticallyHint')}</p>
        )}
      </form>
    </Drawer>
  );
}
