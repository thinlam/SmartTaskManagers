import { createContext, useContext, useState, type ReactNode } from 'react';
import { useTasks, type UseTasksResult } from '@stm/hooks';
import type { Task } from '@stm/types';
import { MOCK_TASKS } from '../mock/tasks';

interface TasksContextValue extends UseTasksResult {
  isDrawerOpen: boolean;
  /** null while creating; the task being edited otherwise. */
  editingTask: Task | null;
  openCreateDrawer: () => void;
  openEditDrawer: (task: Task) => void;
  closeDrawer: () => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

/**
 * One shared task store for the whole app (Phase 12, step 2) — Topbar's
 * "+ New Task" (any page) and the Tasks list both need to read/write the
 * same data, which a page-local useTasks() call (Phase 12, step 1)
 * cannot provide: each mount would start over from MOCK_TASKS. Mounted
 * once around the router in App.tsx, not per-page.
 *
 * Inbox (Phase 11) used to keep its own separate mock task list — now
 * folded into this same store (Inbox = tasks filtered to
 * status === 'Inbox'), since maintaining two disconnected "your tasks"
 * lists in one running app was a real inconsistency, not a deliberate
 * design.
 */
export function TasksProvider({ children }: { children: ReactNode }) {
  const tasksApi = useTasks(MOCK_TASKS);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  function openCreateDrawer() {
    setEditingTask(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(task: Task) {
    setEditingTask(task);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <TasksContext.Provider
      value={{
        ...tasksApi,
        isDrawerOpen,
        editingTask,
        openCreateDrawer,
        openEditDrawer,
        closeDrawer,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasksContext(): TasksContextValue {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasksContext must be used within a TasksProvider');
  }
  return context;
}
