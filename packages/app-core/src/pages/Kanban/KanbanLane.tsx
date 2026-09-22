import type { Project, Task } from '@stm/types';
import {
  KANBAN_MAX_CARDS_PER_LANE,
  getKanbanDueLabel,
  getKanbanDueTone,
  getKanbanProgressTone,
  getKanbanScoreTone,
  type KanbanLaneData,
} from '@stm/shared';
import { Badge, cn } from '@stm/ui';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { KanbanCard } from './KanbanCard';

interface KanbanLaneProps {
  lane: KanbanLaneData;
  today: Date;
  projects: Project[];
  onSelectTask: (task: Task) => void;
}

function buildMeta(task: Task, projects: Project[]): string {
  const parts: string[] = [task.area];
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : undefined;
  if (project) parts.push(project.name);
  return parts.join('  •  ');
}

function buildAction(task: Task, t: TFunction): string {
  if (task.recommendedAction) return task.recommendedAction;
  if (task.description) return task.description;
  return task.status === 'Completed' ? t('kanban.actionCompleted') : t('kanban.continueNextStep');
}

/**
 * Ported from writeKanbanLane_() — lane header + subtitle (danger tone
 * when In Progress goes over the recommended WIP limit, via
 * lane.isOverWip), up to KANBAN_MAX_CARDS_PER_LANE cards, a "+N more"
 * footer when truncated, or the lane's empty-state text.
 */
export function KanbanLane({ lane, today, projects, onSelectTask }: KanbanLaneProps) {
  const { t } = useTranslation();
  const visibleTasks = lane.tasks.slice(0, KANBAN_MAX_CARDS_PER_LANE);
  const hiddenCount = Math.max(0, lane.tasks.length - visibleTasks.length);

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-primary">{lane.status}</h2>
          <Badge tone={lane.isOverWip ? 'danger' : 'neutral'}>{lane.tasks.length}</Badge>
        </div>
        <span
          className={cn('text-xs', lane.isOverWip ? 'font-semibold text-danger' : 'text-ink-muted')}
        >
          {lane.subtitle}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {visibleTasks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-ink-muted">
            {lane.emptyText}
          </p>
        ) : (
          visibleTasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              meta={buildMeta(task, projects)}
              action={buildAction(task, t)}
              dueLabel={getKanbanDueLabel(task.dueDate, task.status, today)}
              dueTone={getKanbanDueTone(task.dueDate, task.status, today)}
              progressTone={getKanbanProgressTone(task.progress)}
              scoreTone={getKanbanScoreTone(task.smartScore ?? 0)}
              onClick={() => onSelectTask(task)}
            />
          ))
        )}

        {hiddenCount > 0 && (
          <span className="rounded-md bg-surface-secondary px-2 py-1 text-center text-xs font-semibold text-ink-secondary">
            {t('kanban.moreCount', { count: hiddenCount })}
          </span>
        )}
      </div>
    </div>
  );
}
