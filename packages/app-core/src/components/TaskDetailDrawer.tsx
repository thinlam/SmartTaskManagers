import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Area, Priority, Task, TaskStatus } from '@stm/types';
import { ApiError } from '@stm/api-client';
import { useTranslation } from 'react-i18next';
import { formatDueLabel } from '@stm/shared';
import { Button, cn, Drawer, PriorityBadge, Progress, StatusBadge } from '@stm/ui';
import { useTasksContext } from '../state/TasksContext';
import { useProjectsContext } from '../state/ProjectsContext';
import { useGoalsContext } from '../state/GoalsContext';
import { translatePriority, translateTaskStatus } from '../lib/enumLabels';

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
const sectionHeadingClasses = 'text-xs font-semibold uppercase tracking-wide text-ink-muted';

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
  const { isDrawerOpen, editingTask, closeDrawer, addTask, updateTask, deleteTask } =
    useTasksContext();
  const { projects } = useProjectsContext();
  const { goals } = useGoalsContext();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDrawerOpen) return;
    setForm(editingTask ? formFromTask(editingTask) : emptyForm());
    setError(null);
  }, [isDrawerOpen, editingTask]);

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
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const shared = buildSharedFields();
    if (!shared.title) return;

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, shared);
      } else {
        await addTask(shared);
      }
      closeDrawer();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('tasks.saveError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddAndCreateAnother() {
    const shared = buildSharedFields();
    if (!shared.title || editingTask) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await addTask(shared);
      setForm(emptyForm());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('tasks.saveError'));
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
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteTask(editingTask.id);
      closeDrawer();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('tasks.deleteError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isCreating = !editingTask;
  const projectName = form.projectId
    ? (projects.find((project) => project.id === form.projectId)?.name ?? null)
    : null;
  const previewDueLabel = formatDueLabel(form.dueDate || null, new Date(), t);

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
              <Button type="button" variant="secondary" onClick={closeDrawer} disabled={isSubmitting}>
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
                disabled={isSubmitting || !form.title.trim()}
              >
                {editingTask ? t('tasks.saveChangesButton') : t('tasks.addTaskButton')}
              </Button>
            </div>
          </div>
        </div>
      }
    >
      {isCreating && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-surface-secondary/50 p-4">
          <span className={sectionHeadingClasses}>{t('tasks.livePreviewTitle')}</span>
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center gap-2">
              <PriorityBadge priority={form.priority} label={translatePriority(t, form.priority)} />
              <StatusBadge status={form.status} label={translateTaskStatus(t, form.status)} />
            </div>
            <span className="text-sm font-semibold text-ink-primary">
              {form.title.trim() || t('tasks.livePreviewPlaceholderTitle')}
            </span>
            <span className="text-xs text-ink-secondary">
              {[projectName, form.area].filter(Boolean).join(' · ')}
            </span>
            <span className="text-xs text-ink-muted">
              {previewDueLabel}
              {form.progress > 0 ? ` · ${form.progress}%` : ''}
            </span>
            <Progress value={form.progress} />
          </div>
        </div>
      )}

      <form
        id="task-detail-form"
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        className="flex flex-col gap-5"
      >
        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-col gap-3">
          <span className={sectionHeadingClasses}>{t('tasks.sectionTaskDetails')}</span>
          <div className="flex flex-col gap-1">
            <label htmlFor="task-title" className={labelClasses}>
              {t('tasks.fieldTitle')} *
            </label>
            <input
              id="task-title"
              type="text"
              required
              maxLength={120}
              autoFocus={isCreating}
              value={form.title}
              onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
              className={fieldClasses}
              placeholder={t('tasks.titlePlaceholder')}
            />
          </div>

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
        </div>

        <div className="flex flex-col gap-3">
          <span className={sectionHeadingClasses}>{t('tasks.sectionAssignment')}</span>
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

        <div className="flex flex-col gap-3">
          <span className={sectionHeadingClasses}>{t('tasks.sectionPriorityStatus')}</span>
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
              onChange={(event) => setForm((f) => ({ ...f, progress: Number(event.target.value) }))}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className={sectionHeadingClasses}>{t('tasks.sectionSchedule')}</span>
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
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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
        </div>

        {isCreating && (
          <p className="rounded-lg border border-primary/20 bg-primary-light/40 px-3 py-2.5 text-xs text-primary">
            {t('tasks.calculatedAutomaticallyHint')}
          </p>
        )}
      </form>
    </Drawer>
  );
}
