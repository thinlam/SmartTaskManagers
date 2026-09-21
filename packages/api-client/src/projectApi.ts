import type { Project } from '@stm/types';
import { httpClient } from './httpClient';
import { areaToBackend, areaToFrontend } from './enumMappings';

/** Raw shape SmartTask.Api's ProjectResponse serializes to (Phase 24). `health` is intentionally dropped below — frontend never stores it, always computes it (see @stm/types's Project doc comment). */
interface ProjectDto {
  id: string;
  name: string;
  area: string;
  health: string;
  targetDate: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

function fromDto(dto: ProjectDto): Project {
  return {
    id: dto.id,
    name: dto.name,
    area: areaToFrontend(dto.area),
    targetDate: dto.targetDate,
    description: dto.description ?? '',
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export interface ProjectWriteFields {
  name?: string;
  area?: Project['area'];
  targetDate?: string | null;
  description?: string;
}

function toWriteBody(fields: ProjectWriteFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (fields.name !== undefined) body.name = fields.name;
  if (fields.area !== undefined) body.area = areaToBackend(fields.area);
  if (fields.targetDate !== undefined) body.targetDate = fields.targetDate;
  if (fields.description !== undefined) body.description = fields.description;
  return body;
}

/** Matches SmartTask.Api's ProjectsController (Phase 24). */
export const projectApi = {
  getAll: async (): Promise<Project[]> =>
    (await httpClient.get<ProjectDto[]>('/api/projects')).map(fromDto),
  create: async (
    fields: ProjectWriteFields & { name: string; area: Project['area'] },
  ): Promise<Project> =>
    fromDto(await httpClient.post<ProjectDto>('/api/projects', toWriteBody(fields))),
  update: async (id: string, fields: ProjectWriteFields): Promise<Project> =>
    fromDto(await httpClient.patch<ProjectDto>(`/api/projects/${id}`, toWriteBody(fields))),
  remove: (id: string): Promise<void> => httpClient.delete(`/api/projects/${id}`),
};
