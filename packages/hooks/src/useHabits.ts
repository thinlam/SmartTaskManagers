import { useCallback, useState } from 'react';
import type { Habit, HabitFrequency } from '@stm/types';

export interface NewHabitInput {
  name: string;
  frequency?: HabitFrequency;
  targetCount?: number;
}

export interface UseHabitsResult {
  habits: Habit[];
  addHabit: (input: NewHabitInput) => Habit;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  /** Marks today done: +1 streak, +1 completedCount, sets lastCompletedDate. No-op if already checked in today. */
  checkInHabit: (id: string) => void;
}

/**
 * Local habit store (Phase 15) — same pattern as useGoals (Phase 14):
 * Create/Update/Delete mutate React state only, no @stm/api-client call,
 * no persistence (Phase 27).
 *
 * `checkInHabit` has no equivalent to port — apps/google-sheets/src has
 * `createHabit_()`/`getAllHabits_()` only, no habit-completion function
 * anywhere in the source. A naive "+1 streak, +1 completedCount" per
 * check-in (guarded so the same calendar day can't be counted twice) is
 * a reasonable minimal design for this app, not a port of real Sheets
 * logic — deliberately no "reset streak if a day was missed" heuristic,
 * since that would be inventing behavior with no reference to verify
 * against.
 */
export function useHabits(initialHabits: Habit[]): UseHabitsResult {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);

  const addHabit = useCallback((input: NewHabitInput): Habit => {
    const now = new Date().toISOString();
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name: input.name,
      frequency: input.frequency ?? 'Daily',
      streak: 0,
      targetCount: input.targetCount ?? 0,
      completedCount: 0,
      lastCompletedDate: null,
      createdAt: now,
      updatedAt: now,
    };
    setHabits((previous) => [newHabit, ...previous]);
    return newHabit;
  }, []);

  const updateHabit = useCallback((id: string, patch: Partial<Habit>) => {
    setHabits((previous) =>
      previous.map((habit) =>
        habit.id === id ? { ...habit, ...patch, updatedAt: new Date().toISOString() } : habit,
      ),
    );
  }, []);

  const deleteHabit = useCallback((id: string) => {
    setHabits((previous) => previous.filter((habit) => habit.id !== id));
  }, []);

  const checkInHabit = useCallback((id: string) => {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    setHabits((previous) =>
      previous.map((habit) => {
        if (habit.id !== id || habit.lastCompletedDate === today) return habit;
        return {
          ...habit,
          streak: habit.streak + 1,
          completedCount: habit.completedCount + 1,
          lastCompletedDate: today,
          updatedAt: now,
        };
      }),
    );
  }, []);

  return { habits, addHabit, updateHabit, deleteHabit, checkInHabit };
}
