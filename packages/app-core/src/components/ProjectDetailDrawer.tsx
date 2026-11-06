import { useEffect, useState, type FormEvent } from 'react';
import type { Project, ProjectCategory, ProjectField, ProjectPriority } from '@stm/types';
import { ApiError } from '@stm/api-client';
import { useTranslation } from 'react-i18next';
import { Button, Drawer, projectColorPalette } from '@stm/ui';
import { useProjectsContext } from '../state/ProjectsContext';
import { reportSuccess } from '../lib/reportError';
import {
  translateProjectCategory,
  translateProjectField,
  translateProjectPriority,
} from '../lib/enumLabels';

const PRIORITIES: ProjectPriority[] = ['Critical', 'High', 'Medium', 'Low'];
const FIELDS: ProjectField[] = [
  'Technology',
  'Education',
  'Business',
  'Marketing',
  'Finance',
  'Hr',
  'Design',
  'Operations',
  'Healthcare',
  'Legal',
  'Research',
  'Personal',
  'Other',
];
const CATEGORIES: ProjectCategory[] = [
  'Work',
  'Study',
  'SideProject',
  'Personal',
  'Family',
  'Health',
  'PersonalFinance',
  'Other',
];

const fieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';
const labelClasses = 'text-xs font-semibold uppercase tracking-wide text-ink-muted';

interface FormState {
  name: string;
  priority: ProjectPriority;
  color: string | null;
  field: ProjectField | '';
  category: ProjectCategory | '';
  description: string;
}

function emptyForm(): FormState {
  return { name: '', priority: 'Medium', color: null, field: '', category: '', description: '' };
}

function formFromProject(project: Project): FormState {
  return {
    name: project.name,
    priority: project.priority,
    color: project.color,
    field: project.field ?? '',
    category: project.category ?? '',
    description: project.description,
  };
}

/**
 * One form for both Create and Edit, switched on ProjectsContext's
 * editingProject (null = create). Redesigned per the business spec: just
 * Name / Priority / Color / Field ("Lĩnh vực") / Category ("Danh mục") /
 * Description — Area and Target Date (the old form's fields) are no
 * longer entered here. Area still exists on the backend entity (defaults
 * to Personal on create, left untouched on edit) since other code paths
 * reference it, but this form doesn't surface it — the spec's field list
 * doesn't include it. No Health field either: health is always computed
 * from linked tasks (packages/shared's computeProjectHealth), never
 * entered by hand.
 */
export function ProjectDetailDrawer() {
  const { t } = useTranslation();
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
      area: editingProject?.area ?? ('Personal' as const),
      priority: form.priority,
      color: form.color,
      field: form.field === '' ? null : form.field,
      category: form.category === '' ? null : form.category,
      description: form.description,
    };

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingProject) {
        await updateProject(editingProject.id, shared);
        reportSuccess(t('projects.saveChangesButton'));
      } else {
        await addProject(shared);
        reportSuccess(t('projects.addProjectButton'));
      }
      closeDrawer();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? t('projects.nameDuplicateError')
          : err instanceof ApiError
            ? err.message
            : t('projects.saveError'),
      );
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
      setError(err instanceof ApiError ? err.message : t('projects.deleteError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer
      open={isDrawerOpen}
      onClose={closeDrawer}
      title={editingProject ? t('projects.editProjectTitle') : t('projects.newProjectTitle')}
      footer={
        <div className="flex items-center justify-between gap-2">
          {editingProject ? (
            <Button type="button" variant="ghost" onClick={handleDelete} disabled={isSubmitting}>
              {t('projects.deleteButton')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={closeDrawer} disabled={isSubmitting}>
              {t('projects.cancelButton')}
            </Button>
            <Button
              type="submit"
              form="project-detail-form"
              variant="primary"
              disabled={isSubmitting}
            >
              {editingProject ? t('projects.saveChangesButton') : t('projects.addProjectButton')}
            </Button>
          </div>
        </div>
      }
    >
      <form id="project-detail-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-col gap-1">
          <label htmlFor="project-name" className={labelClasses}>
            {t('projects.fieldNameRequired')}
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

        <div className="flex flex-col gap-1">
          <label htmlFor="project-priority" className={labelClasses}>
            {t('projects.fieldPriority')}
          </label>
          <select
            id="project-priority"
            value={form.priority}
            onChange={(event) =>
              setForm((f) => ({ ...f, priority: event.target.value as ProjectPriority }))
            }
            className={fieldClasses}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {translateProjectPriority(t, priority)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className={labelClasses}>{t('projects.fieldColor')}</span>
          <div className="flex flex-wrap items-center gap-2">
            {projectColorPalette.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                aria-pressed={form.color === swatch}
                onClick={() => setForm((f) => ({ ...f, color: swatch }))}
                className={`h-7 w-7 rounded-full border-2 transition-transform ${
                  form.color === swatch
                    ? 'scale-110 border-ink-primary'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: swatch }}
              />
            ))}
            {form.color && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: null }))}
                className="text-xs font-medium text-ink-muted underline-offset-2 hover:underline"
              >
                {t('common.clear')}
              </button>
            )}
          </div>
          <p className="text-xs text-ink-muted">{t('projects.fieldColorHint')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="project-field" className={labelClasses}>
              {t('projects.fieldField')}
            </label>
            <select
              id="project-field"
              value={form.field}
              onChange={(event) =>
                setForm((f) => ({ ...f, field: event.target.value as ProjectField | '' }))
              }
              className={fieldClasses}
            >
              <option value="">{t('projects.fieldFieldPlaceholder')}</option>
              {FIELDS.map((field) => (
                <option key={field} value={field}>
                  {translateProjectField(t, field)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="project-category" className={labelClasses}>
              {t('projects.fieldCategory')}
            </label>
            <select
              id="project-category"
              value={form.category}
              onChange={(event) =>
                setForm((f) => ({ ...f, category: event.target.value as ProjectCategory | '' }))
              }
              className={fieldClasses}
            >
              <option value="">{t('projects.fieldCategoryPlaceholder')}</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {translateProjectCategory(t, category)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="project-description" className={labelClasses}>
            {t('projects.fieldDescriptionGoal')}
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
