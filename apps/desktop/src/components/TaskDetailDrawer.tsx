import { useEffect, useState, type FormEvent } from 'react';
import type { Area, Priority, Task, TaskStatus } from '@stm/types';
import { Button, Drawer } from '@stm/ui';
import { useTasksContext } from '../state/TasksContext';

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
 * No Project field yet — Projects don't exist until Phase 13, so there
 * is nothing real to pick from; projectId stays null through this form.
 */
export function TaskDetailDrawer() {
  const { isDrawerOpen, editingTask, closeDrawer, addTask, updateTask, deleteTask } =
    useTasksContext();
  const [form, setForm] = useState<FormState>(emptyForm());

  useEffect(() => {
    if (!isDrawerOpen) return;
    setForm(editingTask ? formFromTask(editingTask) : emptyForm());
  }, [isDrawerOpen, editingTask]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
      priority: form.priority,
      status: form.status,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
      progress: form.progress,
      tags,
    };

    if (editingTask) {
      updateTask(editingTask.id, shared);
    } else {
      addTask(shared);
    }
    closeDrawer();
  }

  function handleDelete() {
    if (!editingTask) return;
    deleteTask(editingTask.id);
    closeDrawer();
  }

  return (
    <Drawer
      open={isDrawerOpen}
      onClose={closeDrawer}
      title={editingTask ? 'Edit Task' : 'New Task'}
      footer={
        <div className="flex items-center justify-between gap-2">
          {editingTask ? (
            <Button type="button" variant="ghost" onClick={handleDelete}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={closeDrawer}>
              Cancel
            </Button>
            <Button type="submit" form="task-detail-form" variant="primary">
              {editingTask ? 'Save changes' : 'Add task'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="task-detail-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        <div className="grid grid-cols-2 gap-3">
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
              className="mt-2.5 w-full"
            />
          </div>
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
