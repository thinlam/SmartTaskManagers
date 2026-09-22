import { useEffect, useState, type FormEvent } from 'react';
import type { Area, Project } from '@stm/types';
import { ApiError } from '@stm/api-client';
import { Button, Drawer } from '@stm/ui';
import { useProjectsContext } from '../state/ProjectsContext';

const AREAS: Area[] = ['Career', 'Learning', 'Health', 'Personal', 'Personal Admin'];

const fieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';
const labelClasses = 'text-xs font-semibold uppercase tracking-wide text-ink-muted';

interface FormState {
  name: string;
  area: Area;
  targetDate: string;
  description: string;
}

function emptyForm(): FormState {
  return { name: '', area: 'Personal', targetDate: '', description: '' };
}

function formFromProject(project: Project): FormState {
  return {
    name: project.name,
    area: project.area,
    targetDate: project.targetDate ?? '',
    description: project.description,
  };
}

/**
 * One form for both Create and Edit, switched on ProjectsContext's
 * editingProject (null = create) — same pattern as TaskDetailDrawer
 * (Phase 12). No Health field: health is always computed from linked
 * tasks (packages/shared's computeProjectHealth), never entered by hand.
 */
export function ProjectDetailDrawer() {
  const { isDrawerOpen, editingProject, closeDrawer, addProject, updateProject, deleteProject } =
    useProjectsContext();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDrawerOpen) return;
    setForm(editingProject ? formFromProject(editingProject) : emptyForm());
    setError(null);
  }, [isDrawerOpen, editingProject]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;

    const shared = {
      name,
      area: form.area,
      targetDate: form.targetDate || null,
      description: form.description,
    };

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingProject) {
        await updateProject(editingProject.id, shared);
      } else {
        await addProject(shared);
      }
      closeDrawer();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this project.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editingProject) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteProject(editingProject.id);
      closeDrawer();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete this project.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer
      open={isDrawerOpen}
      onClose={closeDrawer}
      title={editingProject ? 'Edit Project' : 'New Project'}
      footer={
        <div className="flex items-center justify-between gap-2">
          {editingProject ? (
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
            <Button
              type="submit"
              form="project-detail-form"
              variant="primary"
              disabled={isSubmitting}
            >
              {editingProject ? 'Save changes' : 'Add project'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="project-detail-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-col gap-1">
          <label htmlFor="project-name" className={labelClasses}>
            Name
          </label>
          <input
            id="project-name"
            type="text"
            required
            value={form.name}
            onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
            className={fieldClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="project-area" className={labelClasses}>
              Area
            </label>
            <select
              id="project-area"
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
            <label htmlFor="project-target-date" className={labelClasses}>
              Target Date
            </label>
            <input
              id="project-target-date"
              type="date"
              value={form.targetDate}
              onChange={(event) => setForm((f) => ({ ...f, targetDate: event.target.value }))}
              className={fieldClasses}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="project-description" className={labelClasses}>
            Description
          </label>
          <textarea
            id="project-description"
            rows={4}
            value={form.description}
            onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
            className={fieldClasses}
          />
        </div>
      </form>
    </Drawer>
  );
}
