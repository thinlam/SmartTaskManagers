import { createContext, useContext, useState, type ReactNode } from 'react';
import { useProjects, type UseProjectsResult } from '@stm/hooks';
import type { Project } from '@stm/types';

interface ProjectsContextValue extends UseProjectsResult {
  isDrawerOpen: boolean;
  /** null while creating; the project being edited otherwise. */
  editingProject: Project | null;
  openCreateDrawer: () => void;
  openEditDrawer: (project: Project) => void;
  closeDrawer: () => void;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

/**
 * One shared project store for the whole app (Phase 13) — same reason as
 * TasksProvider (Phase 12, step 2): TaskDetailDrawer needs the current
 * project list for its Project select field regardless of which page is
 * active, so a page-local useProjects() call wouldn't work. Mounted once
 * around the router in App.tsx, alongside TasksProvider.
 *
 * `useProjects()` takes no seed data since Phase 27 — fetches from the
 * real backend on mount instead of MOCK_PROJECTS.
 */
export function ProjectsProvider({ children }: { children: ReactNode }) {
  const projectsApi = useProjects();
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  function openCreateDrawer() {
    setEditingProject(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(project: Project) {
    setEditingProject(project);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <ProjectsContext.Provider
      value={{
        ...projectsApi,
        isDrawerOpen,
        editingProject,
        openCreateDrawer,
        openEditDrawer,
        closeDrawer,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjectsContext(): ProjectsContextValue {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjectsContext must be used within a ProjectsProvider');
  }
  return context;
}
