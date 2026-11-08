import { createContext, useContext, type ReactNode } from 'react';
import { useTags, type UseTagsResult } from '@stm/hooks';

const TagsContext = createContext<UseTagsResult | null>(null);

/**
 * One shared tag store (Việc 1) — same reason as ProjectsProvider: the
 * chip-input autocomplete in TaskDetailDrawer, the "Thẻ" filter on
 * TasksPage, and TagsManagementPage all need the same up-to-date tag
 * list regardless of which page is active.
 */
export function TagsProvider({ children }: { children: ReactNode }) {
  const tagsApi = useTags();
  return <TagsContext.Provider value={tagsApi}>{children}</TagsContext.Provider>;
}

export function useTagsContext(): UseTagsResult {
  const context = useContext(TagsContext);
  if (!context) {
    throw new Error('useTagsContext must be used within a TagsProvider');
  }
  return context;
}
