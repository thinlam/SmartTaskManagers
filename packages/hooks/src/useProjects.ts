import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@stm/types';
import { projectApi, type ProjectWriteFields } from '@stm/api-client';

export interface NewProjectInput {
  name: string;
  area: Project['area'];
  targetDate?: string | null;
  description?: string;
}

export interface UseProjectsResult {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  addProject: (input: NewProjectInput) => Promise<Project>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

/**
 * Real backend store (Phase 27) — same shape/reasoning as useTasks.
 * `deleteProject`'s old "dangling reference" limitation is gone: the
 * backend enforces `ON DELETE SET NULL` on `Tasks.ProjectId` for real
 * (Phase 21/24), so a deleted project's tasks get their `projectId`
 * cleared by the database itself, not left dangling like the old local
 * store did.
 */
export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    projectApi
      .getAll()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load projects.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addProject = useCallback(async (input: NewProjectInput): Promise<Project> => {
    const created = await projectApi.create(input);
    setProjects((previous) => [created, ...previous]);
    return created;
  }, []);

  const updateProject = useCallback(
    async (id: string, patch: Partial<Project>): Promise<Project> => {
      const fields: ProjectWriteFields = {
        name: patch.name,
        area: patch.area,
        targetDate: patch.targetDate,
        description: patch.description,
      };
      const updated = await projectApi.update(id, fields);
      setProjects((previous) => previous.map((project) => (project.id === id ? updated : project)));
      return updated;
    },
    [],
  );

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    await projectApi.remove(id);
    setProjects((previous) => previous.filter((project) => project.id !== id));
  }, []);

  return { projects, isLoading, error, addProject, updateProject, deleteProject };
}
