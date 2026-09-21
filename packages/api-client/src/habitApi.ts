import type { Habit } from '@stm/types';
import { httpClient } from './httpClient';

/** Raw shape SmartTask.Api's HabitResponse serializes to (Phase 26) — no enum mapping needed, HabitFrequency's values contain no spaces on either side. */
interface HabitDto {
  id: string;
  name: string;
  frequency: string;
  streak: number;
  targetCount: number;
  completedCount: number;
  lastCompletedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

function fromDto(dto: HabitDto): Habit {
  return {
    id: dto.id,
    name: dto.name,
    frequency: dto.frequency as Habit['frequency'],
    streak: dto.streak,
    targetCount: dto.targetCount,
    completedCount: dto.completedCount,
    lastCompletedDate: dto.lastCompletedDate,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export interface HabitWriteFields {
  name?: string;
  frequency?: Habit['frequency'];
  targetCount?: number;
}

/** Matches SmartTask.Api's HabitsController (Phase 26) — includes POST .../check-in, mirrored by useHabits.checkInHabit(). */
export const habitApi = {
  getAll: async (): Promise<Habit[]> =>
    (await httpClient.get<HabitDto[]>('/api/habits')).map(fromDto),
  create: async (fields: HabitWriteFields & { name: string }): Promise<Habit> =>
    fromDto(await httpClient.post<HabitDto>('/api/habits', fields)),
  update: async (id: string, fields: HabitWriteFields): Promise<Habit> =>
    fromDto(await httpClient.patch<HabitDto>(`/api/habits/${id}`, fields)),
  checkIn: async (id: string): Promise<Habit> =>
    fromDto(await httpClient.post<HabitDto>(`/api/habits/${id}/check-in`)),
  remove: (id: string): Promise<void> => httpClient.delete(`/api/habits/${id}`),
};
