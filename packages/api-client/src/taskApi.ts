import type { Task } from '@stm/types';
import { httpClient } from './httpClient';
import {
  areaToBackend,
  areaToFrontend,
  taskStatusToBackend,
  taskStatusToFrontend,
} from './enumMappings';

/** Raw shape SmartTask.Api's TaskResponse serializes to (Phase 23) — backend field names, not frontend ones. */
interface TaskDto {
  id: string;
  name: string;
  description: string | null;
  area: string;
  projectId: string | null;
  category: string | null;
  tags: string | null;
  priority: string;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  dueTime: string | null;
  completedDate: string | null;
  progress: number;
  estimateMinutes: number | null;
  energy: string | null;
  context: string | null;
  goalId: string | null;
  recurringType: string;
  dependencyTaskId: string | null;
  smartScore: number | null;
  risk: string | null;
  recommendedAction: string | null;
  createdAt: string;
  updatedAt: string;
  lastStatusChangedAt: string | null;
  notes: string | null;
}

function fromDto(dto: TaskDto): Task {
  return {
    id: dto.id,
    title: dto.name,
    description: dto.description ?? '',
    area: areaToFrontend(dto.area),
    projectId: dto.projectId,
    goalId: dto.goalId,
    tags: dto.tags
      ? dto.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
    priority: dto.priority as Task['priority'],
    status: taskStatusToFrontend(dto.status),
    startDate: dto.startDate,
    dueDate: dto.dueDate,
    completedDate: dto.completedDate,
    progress: dto.progress,
    estimateMinutes: dto.estimateMinutes,
    smartScore: dto.smartScore ?? undefined,
    risk: (dto.risk as Task['risk']) ?? undefined,
    recommendedAction: dto.recommendedAction ?? undefined,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Fields packages/hooks's useTasks.addTask()/updateTask() accept — see NewTaskInput there. */
export interface TaskWriteFields {
  title?: string;
  description?: string;
  area?: Task['area'];
  projectId?: string | null;
  goalId?: string | null;
  tags?: string[];
  priority?: Task['priority'];
  status?: Task['status'];
  startDate?: string | null;
  dueDate?: string | null;
  progress?: number;
}

function toWriteBody(fields: TaskWriteFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (fields.title !== undefined) body.name = fields.title;
  if (fields.description !== undefined) body.description = fields.description;
  if (fields.area !== undefined) body.area = areaToBackend(fields.area);
  if (fields.projectId !== undefined) body.projectId = fields.projectId;
  if (fields.goalId !== undefined) body.goalId = fields.goalId;
  if (fields.tags !== undefined) body.tags = fields.tags.join(',');
  if (fields.priority !== undefined) body.priority = fields.priority;
  if (fields.status !== undefined) body.status = taskStatusToBackend(fields.status);
  if (fields.startDate !== undefined) body.startDate = fields.startDate;
  if (fields.dueDate !== undefined) body.dueDate = fields.dueDate;
  if (fields.progress !== undefined) body.progress = fields.progress;
  return body;
}

/** Matches SmartTask.Api's TasksController (Phase 23) — GET/POST/PATCH/POST .../complete/DELETE on /api/tasks. */
export const taskApi = {
  getAll: async (): Promise<Task[]> => (await httpClient.get<TaskDto[]>('/api/tasks')).map(fromDto),
  create: async (fields: TaskWriteFields & { title: string; area: Task['area'] }): Promise<Task> =>
    fromDto(await httpClient.post<TaskDto>('/api/tasks', toWriteBody(fields))),
  update: async (id: string, fields: TaskWriteFields): Promise<Task> =>
    fromDto(await httpClient.patch<TaskDto>(`/api/tasks/${id}`, toWriteBody(fields))),
  complete: async (id: string): Promise<Task> =>
    fromDto(await httpClient.post<TaskDto>(`/api/tasks/${id}/complete`)),
  remove: (id: string): Promise<void> => httpClient.delete(`/api/tasks/${id}`),
};
