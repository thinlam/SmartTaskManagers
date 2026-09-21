import { useCallback, useEffect, useState } from 'react';
import type { Habit } from '@stm/types';
import { habitApi, type HabitWriteFields } from '@stm/api-client';

export interface NewHabitInput {
  name: string;
  frequency?: Habit['frequency'];
  targetCount?: number;
}

export interface UseHabitsResult {
  habits: Habit[];
  isLoading: boolean;
  error: string | null;
  addHabit: (input: NewHabitInput) => Promise<Habit>;
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<Habit>;
  deleteHabit: (id: string) => Promise<void>;
  /** Calls SmartTask.Api's POST /api/habits/{id}/check-in (Phase 26) — the real no-op-if-already-checked-in-today logic now lives server-side, not in this hook. */
  checkInHabit: (id: string) => Promise<Habit>;
}

/** Real backend store (Phase 27) — same shape/reasoning as useTasks/useProjects/useGoals. */
export function useHabits(): UseHabitsResult {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    habitApi
      .getAll()
      .then((data) => {
        if (!cancelled) setHabits(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load habits.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addHabit = useCallback(async (input: NewHabitInput): Promise<Habit> => {
    const created = await habitApi.create(input);
    setHabits((previous) => [created, ...previous]);
    return created;
  }, []);

  const updateHabit = useCallback(async (id: string, patch: Partial<Habit>): Promise<Habit> => {
    const fields: HabitWriteFields = {
      name: patch.name,
      frequency: patch.frequency,
      targetCount: patch.targetCount,
    };
    const updated = await habitApi.update(id, fields);
    setHabits((previous) => previous.map((habit) => (habit.id === id ? updated : habit)));
    return updated;
  }, []);

  const deleteHabit = useCallback(async (id: string): Promise<void> => {
    await habitApi.remove(id);
    setHabits((previous) => previous.filter((habit) => habit.id !== id));
  }, []);

  const checkInHabit = useCallback(async (id: string): Promise<Habit> => {
    const checkedIn = await habitApi.checkIn(id);
    setHabits((previous) => previous.map((habit) => (habit.id === id ? checkedIn : habit)));
    return checkedIn;
  }, []);

  return { habits, isLoading, error, addHabit, updateHabit, deleteHabit, checkInHabit };
}
