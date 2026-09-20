import { useCallback, useState } from 'react';
import type { Area, Goal, GoalStatus } from '@stm/types';

export interface NewGoalInput {
  name: string;
  area: Area;
  targetDate?: string | null;
  progress?: number;
  status?: GoalStatus;
}

export interface UseGoalsResult {
  goals: Goal[];
  addGoal: (input: NewGoalInput) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
}

/**
 * Local goal store (Phase 14) — same pattern as useProjects (Phase 13):
 * Create/Update/Delete mutate React state only, no @stm/api-client call,
 * no persistence (Phase 27).
 *
 * Known simplification: deleteGoal does not touch tasks that reference
 * the deleted goal's id — their `goalId` is left dangling rather than
 * cleared. Same accepted tradeoff as useProjects's deleteProject; a real
 * backend (Phase 27) needs real referential-integrity handling.
 */
export function useGoals(initialGoals: Goal[]): UseGoalsResult {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);

  const addGoal = useCallback((input: NewGoalInput): Goal => {
    const now = new Date().toISOString();
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      name: input.name,
      area: input.area,
      targetDate: input.targetDate ?? null,
      progress: input.progress ?? 0,
      status: input.status ?? 'On Track',
      createdAt: now,
      updatedAt: now,
    };
    setGoals((previous) => [newGoal, ...previous]);
    return newGoal;
  }, []);

  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    setGoals((previous) =>
      previous.map((goal) =>
        goal.id === id ? { ...goal, ...patch, updatedAt: new Date().toISOString() } : goal,
      ),
    );
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((previous) => previous.filter((goal) => goal.id !== id));
  }, []);

  return { goals, addGoal, updateGoal, deleteGoal };
}
