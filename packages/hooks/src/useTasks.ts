import { useCallback, useState } from 'react';
import type { Area, Priority, Task, TaskStatus } from '@stm/types';

export interface NewTaskInput {
  title: string;
  area: Area;
  description?: string;
  /** References a Project's id (Phase 13) — omit or pass null for no project. */
  projectId?: string | null;
  priority?: Priority;
  /** Defaults to 'Inbox' — matches Quick Add's real default status. */
  status?: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
  progress?: number;
  tags?: string[];
}

export interface UseTasksResult {
  tasks: Task[];
  addTask: (input: NewTaskInput) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
}

/**
 * Local task store (Phase 12) — Create/Update/Delete all mutate React
 * state only, the same as Inbox (Phase 11). No persistence and no
 * @stm/api-client call yet: that wiring is Phase 27. The public shape
 * (tasks + add/update/delete/complete) is deliberately what a real
 * API-backed version would expose too, so a page calling this hook won't
 * need to change when Phase 27 swaps what's inside.
 */
export function useTasks(initialTasks: Task[]): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const addTask = useCallback((input: NewTaskInput): Task => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description ?? '',
      area: input.area,
      projectId: input.projectId ?? null,
      tags: input.tags ?? [],
      priority: input.priority ?? 'Medium',
      status: input.status ?? 'Inbox',
      startDate: input.startDate ?? null,
      dueDate: input.dueDate ?? null,
      completedDate: null,
      progress: input.progress ?? 0,
      estimateMinutes: null,
      createdAt: now,
      updatedAt: now,
    };
    setTasks((previous) => [newTask, ...previous]);
    return newTask;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((previous) =>
      previous.map((task) =>
        task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task,
      ),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((previous) => previous.filter((task) => task.id !== id));
  }, []);

  const completeTask = useCallback((id: string) => {
    const now = new Date().toISOString();
    setTasks((previous) =>
      previous.map((task) =>
        task.id === id
          ? { ...task, status: 'Completed', progress: 100, completedDate: now, updatedAt: now }
          : task,
      ),
    );
  }, []);

  return { tasks, addTask, updateTask, deleteTask, completeTask };
}
