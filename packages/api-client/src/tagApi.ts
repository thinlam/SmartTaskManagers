import { httpClient } from './httpClient';

/** Raw shape SmartTask.Api's TagResponse serializes to. */
export interface TagDto {
  id: string;
  name: string;
  taskCount: number;
}

/** Matches SmartTask.Api's TagsController. */
export const tagApi = {
  getAll: (): Promise<TagDto[]> => httpClient.get<TagDto[]>('/api/tags'),
  rename: (id: string, name: string): Promise<TagDto> =>
    httpClient.put<TagDto>(`/api/tags/${id}`, { name }),
  merge: (sourceTagId: string, targetTagId: string): Promise<TagDto> =>
    httpClient.post<TagDto>('/api/tags/merge', { sourceTagId, targetTagId }),
  delete: (id: string): Promise<void> => httpClient.delete(`/api/tags/${id}`),
};
