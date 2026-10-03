import { useState } from 'react';
import type { Project, Task, TaskStatus } from '@stm/types';
import {
  KANBAN_MAX_CARDS_PER_LANE,
  getKanbanDueLabel,
  getKanbanDueTone,
  getKanbanProgressTone,
  getKanbanScoreTone,
  type KanbanLaneData,
} from '@stm/shared';
import { Badge, cn } from '@stm/ui';
import { Plus } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { KanbanCard } from './KanbanCard';

interface KanbanLaneProps {
  lane: KanbanLaneData;
  today: Date;
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  onDropTask: (taskId: string, status: TaskStatus) => void;
  onCardDragStart: (taskId: string) => void;
  onCardDragEnd: () => void;
  draggedTaskId: string | null;
  smartScoreEnabled: boolean;
  explainRecommendations: boolean;
}

const LANE_BAR_CLASS: Record<TaskStatus, string> = {
  Inbox: 'bg-status-inbox',
  'To Do': 'bg-status-to-do',
  'In Progress': 'bg-status-in-progress',
  Waiting: 'bg-status-waiting',
  Completed: 'bg-status-completed',
};

const LANE_DOT_CLASS: Record<TaskStatus, string> = LANE_BAR_CLASS;

function buildMeta(task: Task, projects: Project[]): string {
  const parts: string[] = [task.area];
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : undefined;
  if (project) parts.push(project.name);
  return parts.join('  •  ');
}

function buildAction(task: Task, t: TFunction, explainRecommendations: boolean): string {
  if (explainRecommendations && task.recommendedAction) return task.recommendedAction;
  if (task.description) return task.description;
  return task.status === 'Completed' ? t('kanban.actionCompleted') : t('kanban.continueNextStep');
}

/**
 * Ported from writeKanbanLane_() — lane header + subtitle (danger tone
 * when In Progress goes over the recommended WIP limit, via
 * lane.isOverWip), up to KANBAN_MAX_CARDS_PER_LANE cards, a "+N more"
 * footer when truncated, or the lane's empty-state text. Frame 08
 * redesign: a colored top bar per lane (matching its status color
 * token), a real "+" button to create a task pre-filled with this
 * lane's status, and native HTML5 drag-and-drop — dropping a card here
 * calls onDropTask, which the page wires to a real updateTask(id,
 * { status }) call.
 */
export function KanbanLane({
  lane,
  today,
  projects,
  onSelectTask,
  onAddTask,
  onDropTask,
  onCardDragStart,
  onCardDragEnd,
  draggedTaskId,
  smartScoreEnabled,
  explainRecommendations,
}: KanbanLaneProps) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const visibleTasks = lane.tasks.slice(0, KANBAN_MAX_CARDS_PER_LANE);
  const hiddenCount = Math.max(0, lane.tasks.length - visibleTasks.length);

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className={cn('h-1 rounded-t-md', LANE_BAR_CLASS[lane.status])} aria-hidden="true" />
      <div
        className={cn(
          'flex flex-1 flex-col gap-2 rounded-b-md border border-t-0 border-border bg-surface-secondary/30 p-2 transition-colors',
          isDragOver && 'bg-primary-light/60 ring-2 ring-primary/40',
        )}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
        onDragEnter={() => setIsDragOver(true)}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          const taskId = event.dataTransfer.getData('text/plain');
          if (taskId) onDropTask(taskId, lane.status);
        }}
      >
        <div className="flex flex-col gap-0.5 px-1 pt-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span
                className={cn('h-2 w-2 rounded-full', LANE_DOT_CLASS[lane.status])}
                aria-hidden="true"
              />
              {lane.status}
            </span>
            <div className="flex items-center gap-1">
              <Badge tone={lane.isOverWip ? 'danger' : 'neutral'}>{lane.tasks.length}</Badge>
              <button
                type="button"
                onClick={() => onAddTask(lane.status)}
                aria-label={t('kanban.addTaskToLane', { status: lane.status })}
                className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-secondary hover:text-ink-primary"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
          <span
            className={cn(
              'text-xs',
              lane.isOverWip ? 'font-semibold text-danger' : 'text-ink-muted',
            )}
          >
            {lane.subtitle}
          </span>
        </div>

        <div className="flex flex-col gap-2 px-1 pb-1">
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
                action={buildAction(task, t, explainRecommendations)}
                dueLabel={getKanbanDueLabel(task.dueDate, task.status, today)}
                dueTone={getKanbanDueTone(task.dueDate, task.status, today)}
                progressTone={getKanbanProgressTone(task.progress)}
                scoreTone={getKanbanScoreTone(task.smartScore ?? 0)}
                smartScoreEnabled={smartScoreEnabled}
                isDragging={draggedTaskId === task.id}
                onClick={() => onSelectTask(task)}
                onDragStart={() => onCardDragStart(task.id)}
                onDragEnd={onCardDragEnd}
              />
            ))
          )}

          {hiddenCount > 0 && (
            <span className="rounded-md bg-surface-secondary px-2 py-1 text-center text-xs font-semibold text-ink-secondary">
              {t('kanban.moreCount', { count: hiddenCount })}
            </span>
          )}

          <button
            type="button"
            onClick={() => onAddTask(lane.status)}
            className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs font-medium text-ink-muted transition-colors hover:border-border-strong hover:bg-surface-secondary hover:text-ink-primary"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t('kanban.addTaskButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
