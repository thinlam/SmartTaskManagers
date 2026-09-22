import { useEffect, useState, type FormEvent } from 'react';
import type { Habit, HabitFrequency } from '@stm/types';
import { ApiError } from '@stm/api-client';
import { Button, Drawer } from '@stm/ui';
import { useHabitsContext } from '../state/HabitsContext';

const FREQUENCIES: HabitFrequency[] = ['Daily', 'Weekly', 'Custom'];

const fieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';
const labelClasses = 'text-xs font-semibold uppercase tracking-wide text-ink-muted';

interface FormState {
  name: string;
  frequency: HabitFrequency;
  /** '' = no target set — matches targetCount 0. */
  targetCount: string;
}

function emptyForm(): FormState {
  return { name: '', frequency: 'Daily', targetCount: '' };
}

function formFromHabit(habit: Habit): FormState {
  return {
    name: habit.name,
    frequency: habit.frequency,
    targetCount: habit.targetCount > 0 ? String(habit.targetCount) : '',
  };
}

/**
 * One form for both Create and Edit, switched on HabitsContext's
 * editingHabit (null = create) — same pattern as GoalDetailDrawer
 * (Phase 14). No Streak/CompletedCount/LastCompletedDate fields: those
 * only change via the "Check in today" action on HabitCard, not manual
 * edit — there's no real equivalent to entering them by hand in Sheets
 * either (`createHabit_()` only ever sets them to their zero defaults).
 */
export function HabitDetailDrawer() {
  const { isDrawerOpen, editingHabit, closeDrawer, addHabit, updateHabit, deleteHabit } =
    useHabitsContext();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDrawerOpen) return;
    setForm(editingHabit ? formFromHabit(editingHabit) : emptyForm());
    setError(null);
  }, [isDrawerOpen, editingHabit]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;

    const shared = {
      name,
      frequency: form.frequency,
      targetCount: form.targetCount ? Math.max(0, Number(form.targetCount)) : 0,
    };

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingHabit) {
        await updateHabit(editingHabit.id, shared);
      } else {
        await addHabit(shared);
      }
      closeDrawer();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this habit.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editingHabit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteHabit(editingHabit.id);
      closeDrawer();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete this habit.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer
      open={isDrawerOpen}
      onClose={closeDrawer}
      title={editingHabit ? 'Edit Habit' : 'New Habit'}
      footer={
        <div className="flex items-center justify-between gap-2">
          {editingHabit ? (
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
              form="habit-detail-form"
              variant="primary"
              disabled={isSubmitting}
            >
              {editingHabit ? 'Save changes' : 'Add habit'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="habit-detail-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-col gap-1">
          <label htmlFor="habit-name" className={labelClasses}>
            Name
          </label>
          <input
            id="habit-name"
            type="text"
            required
            value={form.name}
            onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
            className={fieldClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="habit-frequency" className={labelClasses}>
              Frequency
            </label>
            <select
              id="habit-frequency"
              value={form.frequency}
              onChange={(event) =>
                setForm((f) => ({ ...f, frequency: event.target.value as HabitFrequency }))
              }
              className={fieldClasses}
            >
              {FREQUENCIES.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {frequency}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="habit-target" className={labelClasses}>
              Target count
            </label>
            <input
              id="habit-target"
              type="number"
              min={0}
              placeholder="No target"
              value={form.targetCount}
              onChange={(event) => setForm((f) => ({ ...f, targetCount: event.target.value }))}
              className={fieldClasses}
            />
          </div>
        </div>
      </form>
    </Drawer>
  );
}
