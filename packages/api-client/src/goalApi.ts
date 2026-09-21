import type { Goal } from '@stm/types';
import { httpClient } from './httpClient';
import {
  areaToBackend,
  areaToFrontend,
  goalStatusToBackend,
  goalStatusToFrontend,
} from './enumMappings';

/** Raw shape SmartTask.Api's GoalResponse serializes to (Phase 25). */
interface GoalDto {
  id: string;
  name: string;
  area: string;
  targetDate: string | null;
  progress: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function fromDto(dto: GoalDto): Goal {
  return {
    id: dto.id,
    name: dto.name,
    area: areaToFrontend(dto.area),
    targetDate: dto.targetDate,
    progress: dto.progress,
    status: goalStatusToFrontend(dto.status),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export interface GoalWriteFields {
  name?: string;
  area?: Goal['area'];
  targetDate?: string | null;
  progress?: number;
  status?: Goal['status'];
}

function toWriteBody(fields: GoalWriteFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (fields.name !== undefined) body.name = fields.name;
  if (fields.area !== undefined) body.area = areaToBackend(fields.area);
  if (fields.targetDate !== undefined) body.targetDate = fields.targetDate;
  if (fields.progress !== undefined) body.progress = fields.progress;
  if (fields.status !== undefined) body.status = goalStatusToBackend(fields.status);
  return body;
}

/** Matches SmartTask.Api's GoalsController (Phase 25). */
export const goalApi = {
  getAll: async (): Promise<Goal[]> => (await httpClient.get<GoalDto[]>('/api/goals')).map(fromDto),
  create: async (fields: GoalWriteFields & { name: string; area: Goal['area'] }): Promise<Goal> =>
    fromDto(await httpClient.post<GoalDto>('/api/goals', toWriteBody(fields))),
  update: async (id: string, fields: GoalWriteFields): Promise<Goal> =>
    fromDto(await httpClient.patch<GoalDto>(`/api/goals/${id}`, toWriteBody(fields))),
  remove: (id: string): Promise<void> => httpClient.delete(`/api/goals/${id}`),
};
