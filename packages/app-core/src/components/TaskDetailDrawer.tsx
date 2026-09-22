import { useEffect, useState, type FormEvent } from 'react';
import type { Area, Priority, Task, TaskStatus } from '@stm/types';
import { ApiError } from '@stm/api-client';
import { Button, Drawer } from '@stm/ui';
import { useTasksContext } from '../state/TasksContext';
import { useProjectsContext } from '../state/ProjectsContext';
import { useGoalsContext } from '../state/GoalsContext';

const AREAS: Area[] = ['Career', 'Learning', 'Health', 'Personal', 'Personal Admin'];
const PRIORITIES: Priority[] = ['Critical', 'Urgent', 'High', 'Medium', 'Low'];
const STATUSES: TaskStatus[] = ['Inbox', 'To Do', 'In Progress', 'Waiting', 'Completed'];

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

/**
 * One form for both Create ("+ New Task" in Topbar, any page) and Edit
 * (row action on the Tasks list), switched on TasksContext's
 * editingTask (null = create). Rendered once in AppShell so it's
 * available from every route, not nested inside TasksPage.
 *
 * Project field (Phase 13) and Goal field (Phase 14) each read their own
 * context directly — Projects, Goals and Tasks are separate providers,
 * all mounted in App.tsx, so this drawer can read from any of them
 * without the contexts needing to know about each other.
 */
export function TaskDetailDrawer() {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return;

    const tags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const shared = {
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
      setError(err instanceof ApiError ? err.message : 'Could not save this task.');
    } finally {
      setIsSubmitting(false);
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
      setError(err instanceof ApiError ? err.message : 'Could not delete this task.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer
      open={isDrawerOpen}
      onClose={closeDrawer}
      title={editingTask ? 'Edit Task' : 'New Task'}
      footer={
        <div className="flex items-center justify-between gap-2">
          {editingTask ? (
            <Button type="button" variant="ghost" onClick={handleDelete} disabled={isSubmitting}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={closeDrawer} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="task-detail-form" variant="primary" disabled={isSubmitting}>
              {editingTask ? 'Save changes' : 'Add task'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="task-detail-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-col gap-1">
          <label htmlFor="task-title" className={labelClasses}>
            Title
          </label>
          <input
            id="task-title"
            type="text"
            required
            value={form.title}
            onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
            className={fieldClasses}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="task-description" className={labelClasses}>
            Description
          </label>
          <textarea
            id="task-description"
            rows={3}
            value={form.description}
            onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
            className={fieldClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="task-area" className={labelClasses}>
              Area
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
              Project
            </label>
            <select
              id="task-project"
              value={form.projectId}
              onChange={(event) => setForm((f) => ({ ...f, projectId: event.target.value }))}
              className={fieldClasses}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="task-goal" className={labelClasses}>
              Goal
            </label>
            <select
              id="task-goal"
              value={form.goalId}
              onChange={(event) => setForm((f) => ({ ...f, goalId: event.target.value }))}
              className={fieldClasses}
            >
              <option value="">No goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="task-priority" className={labelClasses}>
              Priority
            </label>
            <select
              id="task-priority"
              value={form.priority}
              onChange={(event) =>
                setForm((f) => ({ ...f, priority: event.target.value as Priority }))
              }
              className={fieldClasses}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="task-status" className={labelClasses}>
            Status
          </label>
          <select
            id="task-status"
            value={form.status}
            onChange={(event) =>
              setForm((f) => ({ ...f, status: event.target.value as TaskStatus }))
            }
            className={fieldClasses}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="task-progress" className={labelClasses}>
            Progress ({form.progress}%)
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

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="task-start-date" className={labelClasses}>
              Start Date
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
              Due Date
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

        <div className="flex flex-col gap-1">
          <label htmlFor="task-tags" className={labelClasses}>
            Tags
          </label>
          <input
            id="task-tags"
            type="text"
            placeholder="comma, separated, tags"
            value={form.tags}
            onChange={(event) => setForm((f) => ({ ...f, tags: event.target.value }))}
            className={fieldClasses}
          />
        </div>
      </form>
    </Drawer>
  );
}
