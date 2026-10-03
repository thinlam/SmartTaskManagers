import type { Task } from '@stm/types';
import type { KanbanTone } from '@stm/shared';
import { PriorityBadge, cn } from '@stm/ui';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { translatePriority } from '../../lib/enumLabels';
import { useTranslation } from 'react-i18next';

const TONE_CLASSES: Record<KanbanTone, string> = {
  success: 'bg-success-soft text-success',
  primary: 'bg-primary-light text-primary',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-secondary text-ink-secondary',
};

interface KanbanCardProps {
  task: Task;
  meta: string;
  action: string;
  dueLabel: string;
  dueTone: KanbanTone;
  progressTone: KanbanTone;
  scoreTone: KanbanTone;
  smartScoreEnabled: boolean;
  onClick: () => void;
}

/**
 * Ported layout from writeKanbanCard_() — title (italic+muted when
 * Completed), meta line (Priority + Area/Project), a smart-action-or-
 * description line, and a 3-chip footer (Due/Progress/Score, each
 * tone-colored via getKanbanDueTone_/getKanbanProgressTone_/
 * getKanbanScoreTone_). Priority uses the app's existing `PriorityBadge`
 * instead of porting a separate priority-tone background strip — that
 * token family already exists and is the established idiom everywhere
 * else in this app, no reason to duplicate it here.
 *
 * Draggable via @dnd-kit/core's useDraggable rather than native HTML5
 * drag-and-drop — the native `draggable` attribute only ever fires from
 * mouse input, so it silently didn't work via touch in the packaged
 * Android/iOS app. @dnd-kit listens on Pointer/Touch events instead, so
 * the same card is draggable with a mouse or a finger. The click-to-open
 * handler still works because KanbanPage's PointerSensor has a small
 * activation distance — a tap that doesn't move far enough to count as a
 * drag still reaches onClick normally.
 */
export function KanbanCard({
  task,
  meta,
  action,
  dueLabel,
  dueTone,
  progressTone,
  scoreTone,
  smartScoreEnabled,
  onClick,
}: KanbanCardProps) {
  const { t } = useTranslation();
  const isCompleted = task.status === 'Completed';
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'flex touch-none cursor-grab flex-col gap-1.5 rounded-lg border border-border bg-surface p-2.5 text-left transition-colors hover:border-border-strong active:cursor-grabbing',
        isDragging && 'z-10 opacity-40 shadow-lg',
      )}
      {...listeners}
      {...attributes}
    >
      <span
        className={cn(
          'text-sm font-semibold',
          isCompleted ? 'italic text-ink-muted' : 'text-ink-primary',
        )}
      >
        {task.title}
      </span>

      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} label={translatePriority(t, task.priority)} />
        <span className="truncate text-xs text-ink-secondary">{meta}</span>
      </div>

      <span className="line-clamp-2 text-xs text-ink-muted">{action}</span>

      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold">
        <span className={cn('rounded px-1.5 py-0.5', TONE_CLASSES[dueTone])}>{dueLabel}</span>
        <span className={cn('rounded px-1.5 py-0.5', TONE_CLASSES[progressTone])}>
          {task.progress}%
        </span>
        {smartScoreEnabled && (
          <span className={cn('rounded px-1.5 py-0.5', TONE_CLASSES[scoreTone])}>
            {task.smartScore
              ? t('kanban.scoreChip', { score: task.smartScore })
              : t('kanban.scoreChipEmpty')}
          </span>
        )}
      </div>
    </button>
  );
}
