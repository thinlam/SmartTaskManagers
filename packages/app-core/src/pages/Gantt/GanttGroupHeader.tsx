import { ChevronDown, ChevronRight } from 'lucide-react';
import type { GanttVisibleRange } from '@stm/shared';
import { cn } from '@stm/ui';

const HEALTH_TEXT_CLASS: Record<string, string> = {
  Healthy: 'text-success',
  Attention: 'text-warning',
  'At Risk': 'text-danger',
  Critical: 'text-danger',
};

const HEALTH_DOT_CLASS: Record<string, string> = {
  Healthy: 'bg-success',
  Attention: 'bg-warning',
  'At Risk': 'bg-danger',
  Critical: 'bg-danger',
};

interface GanttGroupHeaderProps {
  name: string;
  healthLabel: string;
  healthKey: string;
  progress: number;
  taskCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
  range: GanttVisibleRange;
  /** Day-offset span of this project's earliest start to latest due date, or null if nothing overlaps the visible range. */
  barPosition: { startOffsetDays: number; spanDays: number } | null;
  leftWidth: number;
}

/** A project's group row — name/health/progress/count on the left, a faint full-project-span bar on the right (the mockup's lighter "whole bar" behind each project group), collapsible. */
export function GanttGroupHeader({
  name,
  healthLabel,
  healthKey,
  progress,
  taskCount,
  isCollapsed,
  onToggle,
  range,
  barPosition,
  leftWidth,
}: GanttGroupHeaderProps) {
  return (
    <div className="flex border-b border-border bg-surface-secondary/60">
      <button
        type="button"
        onClick={onToggle}
        style={{ width: leftWidth }}
        className="flex shrink-0 items-center gap-2 px-3 py-2 text-left sticky left-0 z-10 bg-surface-secondary/95 backdrop-blur-sm"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
        )}
        <span className="truncate text-sm font-semibold text-ink-primary">{name}</span>
        {healthLabel && (
          <span
            className={cn('flex items-center gap-1 text-xs font-medium', HEALTH_TEXT_CLASS[healthKey])}
          >
            <span
              className={cn('h-1.5 w-1.5 rounded-full', HEALTH_DOT_CLASS[healthKey])}
              aria-hidden="true"
            />
            {healthLabel}
          </span>
        )}
        <span className="text-xs text-ink-muted">· {progress}% · {taskCount}</span>
      </button>
      <div
        className="relative shrink-0"
        style={{ width: range.dayCount * range.dayWidth, height: 36 }}
      >
        {barPosition && (
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary/30"
            style={{
              left: Math.max(0, barPosition.startOffsetDays) * range.dayWidth,
              width:
                (Math.min(range.dayCount, barPosition.startOffsetDays + barPosition.spanDays) -
                  Math.max(0, barPosition.startOffsetDays)) *
                range.dayWidth,
            }}
          />
        )}
      </div>
    </div>
  );
}
