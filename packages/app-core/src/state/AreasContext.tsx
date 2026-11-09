import { createContext, useContext, type ReactNode } from 'react';
import { useAreas, type UseAreasResult } from '@stm/hooks';

const AreasContext = createContext<UseAreasResult | null>(null);

/** One shared "Lĩnh vực" store — TaskDetailDrawer's combobox and the area management page both need the same up-to-date list. */
export function AreasProvider({ children }: { children: ReactNode }) {
  const areasApi = useAreas();
  return <AreasContext.Provider value={areasApi}>{children}</AreasContext.Provider>;
}

export function useAreasContext(): UseAreasResult {
  const context = useContext(AreasContext);
  if (!context) {
    throw new Error('useAreasContext must be used within an AreasProvider');
  }
  return context;
}
