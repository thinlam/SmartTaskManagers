import { useCallback, useEffect, useState } from 'react';
import { tagApi, type TagDto } from '@stm/api-client';

export interface UseTagsResult {
  tags: TagDto[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  renameTag: (id: string, name: string) => Promise<void>;
  mergeTags: (sourceTagId: string, targetTagId: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
}

/** Backs the Tags chip-input autocomplete and the tag management page (Việc 1). */
export function useTags(): UseTagsResult {
  const [tags, setTags] = useState<TagDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const list = await tagApi.getAll();
      setTags(list);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tags.');
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

  const renameTag = useCallback(async (id: string, name: string): Promise<void> => {
    const updated = await tagApi.rename(id, name);
    setTags((previous) => previous.map((tag) => (tag.id === id ? updated : tag)));
  }, []);

  const mergeTags = useCallback(async (sourceTagId: string, targetTagId: string): Promise<void> => {
    const merged = await tagApi.merge(sourceTagId, targetTagId);
    setTags((previous) =>
      previous
        .filter((tag) => tag.id !== sourceTagId)
        .map((tag) => (tag.id === targetTagId ? merged : tag)),
    );
  }, []);

  const deleteTag = useCallback(async (id: string): Promise<void> => {
    await tagApi.delete(id);
    setTags((previous) => previous.filter((tag) => tag.id !== id));
  }, []);

  return { tags, isLoading, error, refresh, renameTag, mergeTags, deleteTag };
}
