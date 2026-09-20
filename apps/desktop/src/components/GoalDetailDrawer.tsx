import { useEffect, useState, type FormEvent } from 'react';
import type { Area, Goal, GoalStatus } from '@stm/types';
import { Button, Drawer } from '@stm/ui';
import { useGoalsContext } from '../state/GoalsContext';

const AREAS: Area[] = ['Career', 'Learning', 'Health', 'Personal', 'Personal Admin'];
const STATUSES: GoalStatus[] = ['On Track', 'At Risk', 'Completed'];

const fieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';
const labelClasses = 'text-xs font-semibold uppercase tracking-wide text-ink-muted';

interface FormState {
  name: string;
  area: Area;
  targetDate: string;
  progress: number;
  status: GoalStatus;
}

function emptyForm(): FormState {
  return { name: '', area: 'Personal', targetDate: '', progress: 0, status: 'On Track' };
}

function formFromGoal(goal: Goal): FormState {
  return {
    name: goal.name,
    area: goal.area,
    targetDate: goal.targetDate ?? '',
    progress: goal.progress,
    status: goal.status,
  };
}

/**
 * One form for both Create and Edit, switched on GoalsContext's
 * editingGoal (null = create) — same pattern as ProjectDetailDrawer
 * (Phase 13). Unlike Project, Progress and Status ARE editable fields
 * here: Goals have no computed-metrics engine on the Sheets side, so
 * `createGoal_()` (apps/google-sheets/src/03_Data.gs) treats both as
 * plain user input, not derived values.
 */
export function GoalDetailDrawer() {
  const { isDrawerOpen, editingGoal, closeDrawer, addGoal, updateGoal, deleteGoal } =
    useGoalsContext();
  const [form, setForm] = useState<FormState>(emptyForm());

  useEffect(() => {
    if (!isDrawerOpen) return;
    setForm(editingGoal ? formFromGoal(editingGoal) : emptyForm());
  }, [isDrawerOpen, editingGoal]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;

    const shared = {
      name,
      area: form.area,
      targetDate: form.targetDate || null,
      progress: form.progress,
      status: form.status,
    };

    if (editingGoal) {
      updateGoal(editingGoal.id, shared);
    } else {
      addGoal(shared);
    }
    closeDrawer();
  }

  function handleDelete() {
    if (!editingGoal) return;
    deleteGoal(editingGoal.id);
    closeDrawer();
  }

  return (
    <Drawer
      open={isDrawerOpen}
      onClose={closeDrawer}
      title={editingGoal ? 'Edit Goal' : 'New Goal'}
      footer={
        <div className="flex items-center justify-between gap-2">
          {editingGoal ? (
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
            <Button type="submit" form="goal-detail-form" variant="primary">
              {editingGoal ? 'Save changes' : 'Add goal'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="goal-detail-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="goal-name" className={labelClasses}>
            Name
          </label>
          <input
            id="goal-name"
            type="text"
            required
            value={form.name}
            onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
            className={fieldClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="goal-area" className={labelClasses}>
              Area
            </label>
            <select
              id="goal-area"
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
            <label htmlFor="goal-target-date" className={labelClasses}>
              Target Date
            </label>
            <input
              id="goal-target-date"
              type="date"
              value={form.targetDate}
              onChange={(event) => setForm((f) => ({ ...f, targetDate: event.target.value }))}
              className={fieldClasses}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="goal-status" className={labelClasses}>
            Status
          </label>
          <select
            id="goal-status"
            value={form.status}
            onChange={(event) =>
              setForm((f) => ({ ...f, status: event.target.value as GoalStatus }))
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
          <label htmlFor="goal-progress" className={labelClasses}>
            Progress ({form.progress}%)
          </label>
          <input
            id="goal-progress"
            type="range"
            min={0}
            max={100}
            step={5}
            value={form.progress}
            onChange={(event) => setForm((f) => ({ ...f, progress: Number(event.target.value) }))}
            className="w-full"
          />
        </div>
      </form>
    </Drawer>
  );
}
