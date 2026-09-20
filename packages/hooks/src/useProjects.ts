import { useCallback, useState } from 'react';
import type { Area, Project } from '@stm/types';

export interface NewProjectInput {
  name: string;
  area: Area;
  targetDate?: string | null;
  description?: string;
}

export interface UseProjectsResult {
  projects: Project[];
  addProject: (input: NewProjectInput) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
}

/**
 * Local project store (Phase 13) — same pattern as useTasks (Phase 12):
 * Create/Update/Delete mutate React state only, no @stm/api-client call,
 * no persistence (Phase 27). Public shape mirrors what a real API-backed
 * version would expose.
 *
 * Known simplification: deleteProject does not touch tasks that
 * reference the deleted project's id — their `projectId` is left
 * dangling rather than cleared. Acceptable for a local demo store; a
 * real backend (Phase 27) would need real referential-integrity
 * handling (cascade clear, or block delete while tasks are linked).
 */
export function useProjects(initialProjects: Project[]): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const addProject = useCallback((input: NewProjectInput): Project => {
    const now = new Date().toISOString();
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: input.name,
      area: input.area,
      targetDate: input.targetDate ?? null,
      description: input.description ?? '',
      createdAt: now,
      updatedAt: now,
    };
    setProjects((previous) => [newProject, ...previous]);
    return newProject;
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setProjects((previous) =>
      previous.map((project) =>
        project.id === id ? { ...project, ...patch, updatedAt: new Date().toISOString() } : project,
      ),
    );
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((previous) => previous.filter((project) => project.id !== id));
  }, []);

  return { projects, addProject, updateProject, deleteProject };
}
