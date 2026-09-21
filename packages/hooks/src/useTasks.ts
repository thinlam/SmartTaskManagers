import { useCallback, useEffect, useState } from 'react';
import type { Task } from '@stm/types';
import { taskApi, type TaskWriteFields } from '@stm/api-client';

export interface NewTaskInput {
  title: string;
  area: Task['area'];
  description?: string;
  /** References a Project's id (Phase 13) — omit or pass null for no project. */
  projectId?: string | null;
  /** References a Goal's id (Phase 14) — omit or pass null for no goal. */
  goalId?: string | null;
  priority?: Task['priority'];
  /** Defaults to 'Inbox' — matches Quick Add's real default status. */
  status?: Task['status'];
  startDate?: string | null;
  dueDate?: string | null;
  progress?: number;
  tags?: string[];
}

export interface UseTasksResult {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  addTask: (input: NewTaskInput) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<Task>;
}

/**
 * Real backend store (Phase 27) — replaces the Phase 12 local-`useState`
 * version. Fetches from SmartTask.Api's /api/tasks on mount; every
 * mutation calls the real endpoint (SmartTask.Api's TasksController,
 * Phase 23) and reconciles local state from its response, rather than
 * predicting the result locally — the server is the source of truth now,
 * not a `useState` array.
 *
 * The public shape (`tasks` + add/update/delete/complete) is
 * deliberately the same one every page has called since Phase 12 — only
 * the return types moved from sync to `Promise`, which callers that
 * don't await simply don't notice. `patch: Partial<Task>` on
 * `updateTask` carries the exact same "can set, can't clear a nullable
 * field back to null" limitation `@stm/api-client`'s `TaskWriteFields`
 * documents, since it's built directly from the same object.
 */
export function useTasks(): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    taskApi
      .getAll()
      .then((data) => {
        if (!cancelled) setTasks(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load tasks.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addTask = useCallback(async (input: NewTaskInput): Promise<Task> => {
    const created = await taskApi.create(input);
    setTasks((previous) => [created, ...previous]);
    return created;
  }, []);

  const updateTask = useCallback(async (id: string, patch: Partial<Task>): Promise<Task> => {
    const fields: TaskWriteFields = {
      title: patch.title,
      description: patch.description,
      area: patch.area,
      projectId: patch.projectId,
      goalId: patch.goalId,
      tags: patch.tags,
      priority: patch.priority,
      status: patch.status,
      startDate: patch.startDate,
      dueDate: patch.dueDate,
      progress: patch.progress,
    };
    const updated = await taskApi.update(id, fields);
    setTasks((previous) => previous.map((task) => (task.id === id ? updated : task)));
    return updated;
  }, []);

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    await taskApi.remove(id);
    setTasks((previous) => previous.filter((task) => task.id !== id));
  }, []);

  const completeTask = useCallback(async (id: string): Promise<Task> => {
    const completed = await taskApi.complete(id);
    setTasks((previous) => previous.map((task) => (task.id === id ? completed : task)));
    return completed;
  }, []);

  return { tasks, isLoading, error, addTask, updateTask, deleteTask, completeTask };
}
