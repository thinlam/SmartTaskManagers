import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task, TaskStatus } from '@stm/types';
import type { GanttBarPosition, GanttVisibleRange } from '@stm/shared';
import { Badge, cn } from '@stm/ui';

const STATUS_BAR_CLASS: Record<TaskStatus, string> = {
  Inbox: 'bg-status-inbox',
  'To Do': 'bg-status-to-do',
  'In Progress': 'bg-status-in-progress',
  Waiting: 'bg-status-waiting',
  Completed: 'bg-status-completed',
};

interface GanttRowProps {
  task: Task;
  range: GanttVisibleRange;
  barPosition: GanttBarPosition | null;
  leftWidth: number;
  onSelectTask: () => void;
  onReschedule: (dayDelta: number) => void;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * One task's row — Task/Progress/Schedule/Status on the left (sticky),
 * its bar on the right. The bar is draggable: pointerdown + pointermove
 * tracks horizontal movement, snapped to whole days, and on release
 * calls onReschedule with the day delta (the page then shifts both
 * startDate and dueDate by that many days and saves via updateTask —
 * moving the whole bar rather than resizing either edge independently,
 * a deliberately simpler interaction than Frame 10's two-handle resize).
 */
export function GanttRow({
  task,
  range,
  barPosition,
  leftWidth,
  onSelectTask,
  onReschedule,
}: GanttRowProps) {
  const { t } = useTranslation();
  const [dragPx, setDragPx] = useState(0);
  const dragStateRef = useRef<{ startX: number; moved: boolean } | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = task.dueDate ? new Date(task.dueDate) : null;
  if (due) due.setHours(0, 0, 0, 0);
  const diffDays = due ? Math.round((due.getTime() - today.getTime()) / 86_400_000) : null;

  let statusLabel = t('gantt.statusOnTrack');
  let statusTone: 'success' | 'warning' | 'danger' = 'success';
  if (task.status === 'Completed') {
    statusLabel = t('gantt.statusCompleted');
    statusTone = 'success';
  } else if (diffDays !== null && diffDays < 0) {
    statusLabel = t('gantt.statusDelayed', { count: Math.abs(diffDays) });
    statusTone = 'danger';
  } else if (task.status === 'Waiting') {
    statusLabel = t('gantt.statusBlocked');
    statusTone = 'warning';
  } else if (diffDays === 0) {
    statusLabel = t('gantt.statusDueToday');
    statusTone = 'warning';
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!barPosition) return;
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    dragStateRef.current = { startX: event.clientX, moved: false };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = dragStateRef.current;
    if (!state) return;
    const deltaX = event.clientX - state.startX;
    if (Math.abs(deltaX) > 3) state.moved = true;
    setDragPx(deltaX);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = dragStateRef.current;
    dragStateRef.current = null;
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    if (!state) {
      setDragPx(0);
      return;
    }
    if (!state.moved) {
      setDragPx(0);
      onSelectTask();
      return;
    }
    const dayDelta = Math.round(dragPx / range.dayWidth);
    setDragPx(0);
    if (dayDelta !== 0) onReschedule(dayDelta);
  }

  return (
    <div className="flex border-b border-border hover:bg-surface-secondary/40">
      <button
        type="button"
        onClick={onSelectTask}
        style={{ width: leftWidth }}
        className="sticky left-0 z-10 flex shrink-0 items-center gap-2 bg-surface px-3 py-2 text-left"
      >
        <span className="w-[170px] shrink-0 truncate text-sm font-medium text-ink-primary">
          {task.title}
        </span>
        <span className="flex w-[70px] shrink-0 items-center gap-1.5">
          <span className="h-1 w-10 overflow-hidden rounded-full bg-surface-secondary">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${task.progress}%` }}
            />
          </span>
          <span className="text-[11px] text-ink-muted">{task.progress}%</span>
        </span>
        <span className="w-[90px] shrink-0 truncate text-xs text-ink-secondary">
          {task.startDate ? formatShortDate(task.startDate) : '—'}
          {task.dueDate ? ` → ${formatShortDate(task.dueDate).split(' ')[1]}` : ''}
        </span>
        <span className="w-[80px] shrink-0">
          <Badge tone={statusTone}>{statusLabel}</Badge>
        </span>
      </button>

      <div
        className="relative shrink-0"
        style={{ width: range.dayCount * range.dayWidth, height: 44 }}
      >
        {barPosition && (
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={cn(
              'absolute top-1.5 flex cursor-grab items-center rounded-md px-1.5 text-left text-[11px] font-medium text-white shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing',
              barPosition.isDelayed ? 'bg-danger' : STATUS_BAR_CLASS[task.status],
            )}
            style={{
              left: Math.max(-9999, barPosition.startOffsetDays) * range.dayWidth + dragPx,
              width: Math.max(range.dayWidth - 4, barPosition.spanDays * range.dayWidth - 4),
              height: 29,
            }}
            title={task.title}
          >
            <span className="truncate">{task.title}</span>
          </button>
        )}
      </div>
    </div>
  );
}
