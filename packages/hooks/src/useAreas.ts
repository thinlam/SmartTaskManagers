import { useCallback, useEffect, useState } from 'react';
import { areaApi, type TaskAreaDto } from '@stm/api-client';

export interface UseAreasResult {
  areas: TaskAreaDto[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createArea: (nameVi: string, nameEn?: string) => Promise<TaskAreaDto>;
  renameArea: (id: string, nameVi: string, nameEn?: string) => Promise<void>;
  /** replacementAreaId is required if the area still has tasks (ApiError.confirmAction === 'reassign' if omitted and it does). */
  deleteArea: (id: string, replacementAreaId?: string) => Promise<void>;
}

/** Backs the "Lĩnh vực" combobox in TaskDetailDrawer and the area management page. */
export function useAreas(): UseAreasResult {
  const [areas, setAreas] = useState<TaskAreaDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const list = await areaApi.getAll();
      setAreas(list);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load areas.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await refresh();
      if (!cancelled) setIsLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const createArea = useCallback(async (nameVi: string, nameEn?: string): Promise<TaskAreaDto> => {
    const created = await areaApi.create(nameVi, nameEn);
    setAreas((previous) => [...previous, created]);
    return created;
  }, []);

  const renameArea = useCallback(
    async (id: string, nameVi: string, nameEn?: string): Promise<void> => {
      const updated = await areaApi.rename(id, nameVi, nameEn);
      setAreas((previous) => previous.map((area) => (area.id === id ? updated : area)));
    },
    [],
  );

  const deleteArea = useCallback(
    async (id: string, replacementAreaId?: string): Promise<void> => {
      await areaApi.delete(id, replacementAreaId);
      setAreas((previous) => previous.filter((area) => area.id !== id));
      // A reassign-on-delete moves the surviving tasks' areaId server-side —
      // not reflected here, but no page currently keeps tasks + areas in sync live.
    },
    [],
  );

  return { areas, isLoading, error, refresh, createArea, renameArea, deleteArea };
}
