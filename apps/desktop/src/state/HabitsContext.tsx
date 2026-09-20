import { createContext, useContext, useState, type ReactNode } from 'react';
import { useHabits, type UseHabitsResult } from '@stm/hooks';
import type { Habit } from '@stm/types';
import { MOCK_HABITS } from '../mock/habits';

interface HabitsContextValue extends UseHabitsResult {
  isDrawerOpen: boolean;
  /** null while creating; the habit being edited otherwise. */
  editingHabit: Habit | null;
  openCreateDrawer: () => void;
  openEditDrawer: (habit: Habit) => void;
  closeDrawer: () => void;
}

const HabitsContext = createContext<HabitsContextValue | null>(null);

/**
 * One shared habit store for the whole app (Phase 15) — same reason as
 * GoalsProvider (Phase 14): the Topbar/other pages don't currently need
 * habits, but keeping every entity's store at this level (mounted once
 * around the router in App.tsx) is the established, consistent pattern
 * rather than a page-local useHabits() call.
 */
export function HabitsProvider({ children }: { children: ReactNode }) {
  const habitsApi = useHabits(MOCK_HABITS);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  function openCreateDrawer() {
    setEditingHabit(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(habit: Habit) {
    setEditingHabit(habit);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <HabitsContext.Provider
      value={{
        ...habitsApi,
        isDrawerOpen,
        editingHabit,
        openCreateDrawer,
        openEditDrawer,
        closeDrawer,
      }}
    >
      {children}
    </HabitsContext.Provider>
  );
}

export function useHabitsContext(): HabitsContextValue {
  const context = useContext(HabitsContext);
  if (!context) {
    throw new Error('useHabitsContext must be used within a HabitsProvider');
  }
  return context;
}
