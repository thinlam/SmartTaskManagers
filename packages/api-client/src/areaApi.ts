import { httpClient } from './httpClient';

/** Raw shape SmartTask.Api's TaskAreaResponse serializes to. */
export interface TaskAreaDto {
  id: string;
  nameVi: string;
  nameEn: string;
  isSystem: boolean;
  sortOrder: number;
  taskCount: number;
}

/** Matches SmartTask.Api's TaskAreasController. */
export const areaApi = {
  getAll: (): Promise<TaskAreaDto[]> => httpClient.get<TaskAreaDto[]>('/api/task-areas'),
  create: (nameVi: string, nameEn?: string): Promise<TaskAreaDto> =>
    httpClient.post<TaskAreaDto>('/api/task-areas', { nameVi, nameEn }),
  rename: (id: string, nameVi: string, nameEn?: string): Promise<TaskAreaDto> =>
    httpClient.patch<TaskAreaDto>(`/api/task-areas/${id}`, { nameVi, nameEn }),
  /** replacementAreaId is required if the area still has tasks (ApiError.confirmAction === 'reassign' if omitted and it does). */
  delete: (id: string, replacementAreaId?: string): Promise<void> =>
    httpClient.delete(
      `/api/task-areas/${id}${replacementAreaId ? `?replacementAreaId=${replacementAreaId}` : ''}`,
    ),
};
