import { useCallback, useEffect, useState } from 'react';
import type { Goal } from '@stm/types';
import { goalApi, type GoalWriteFields } from '@stm/api-client';

export interface NewGoalInput {
  name: string;
  area: Goal['area'];
  targetDate?: string | null;
  progress?: number;
  status?: Goal['status'];
}

export interface UseGoalsResult {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
  addGoal: (input: NewGoalInput) => Promise<Goal>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<Goal>;
  deleteGoal: (id: string) => Promise<void>;
}

/** Real backend store (Phase 27) — same shape/reasoning as useTasks/useProjects. `Tasks.GoalId`'s ON DELETE SET NULL is now real, same as Projects. */
export function useGoals(): UseGoalsResult {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    goalApi
      .getAll()
      .then((data) => {
        if (!cancelled) setGoals(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load goals.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addGoal = useCallback(async (input: NewGoalInput): Promise<Goal> => {
    const created = await goalApi.create(input);
    setGoals((previous) => [created, ...previous]);
    return created;
  }, []);

  const updateGoal = useCallback(async (id: string, patch: Partial<Goal>): Promise<Goal> => {
    const fields: GoalWriteFields = {
      name: patch.name,
      area: patch.area,
      targetDate: patch.targetDate,
      progress: patch.progress,
      status: patch.status,
    };
    const updated = await goalApi.update(id, fields);
    setGoals((previous) => previous.map((goal) => (goal.id === id ? updated : goal)));
    return updated;
  }, []);

  const deleteGoal = useCallback(async (id: string): Promise<void> => {
    await goalApi.remove(id);
    setGoals((previous) => previous.filter((goal) => goal.id !== id));
  }, []);

  return { goals, isLoading, error, addGoal, updateGoal, deleteGoal };
}
