import { createContext, useContext, useState, type ReactNode } from 'react';
import { useGoals, type UseGoalsResult } from '@stm/hooks';
import type { Goal } from '@stm/types';
import { MOCK_GOALS } from '../mock/goals';

interface GoalsContextValue extends UseGoalsResult {
  isDrawerOpen: boolean;
  /** null while creating; the goal being edited otherwise. */
  editingGoal: Goal | null;
  openCreateDrawer: () => void;
  openEditDrawer: (goal: Goal) => void;
  closeDrawer: () => void;
}

const GoalsContext = createContext<GoalsContextValue | null>(null);

/**
 * One shared goal store for the whole app (Phase 14) — same reason as
 * ProjectsProvider (Phase 13): TaskDetailDrawer needs the current goal
 * list for its Goal select field regardless of which page is active.
 * Mounted once around the router in App.tsx, alongside TasksProvider and
 * ProjectsProvider.
 */
export function GoalsProvider({ children }: { children: ReactNode }) {
  const goalsApi = useGoals(MOCK_GOALS);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  function openCreateDrawer() {
    setEditingGoal(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(goal: Goal) {
    setEditingGoal(goal);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <GoalsContext.Provider
      value={{
        ...goalsApi,
        isDrawerOpen,
        editingGoal,
        openCreateDrawer,
        openEditDrawer,
        closeDrawer,
      }}
    >
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoalsContext(): GoalsContextValue {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoalsContext must be used within a GoalsProvider');
  }
  return context;
}
