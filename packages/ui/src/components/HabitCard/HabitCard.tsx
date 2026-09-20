import type { HabitFrequency } from '@stm/types';
import { Flame } from 'lucide-react';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Progress } from '../Progress';

export interface HabitCardProps {
  name: string;
  frequency: HabitFrequency;
  streak: number;
  completedCount: number;
  /** 0 = no target set — hides the progress bar. */
  targetCount: number;
  lastDoneLabel: string;
  checkedInToday: boolean;
  onCheckIn: () => void;
}

/**
 * No Frame/Sheets view precedent (apps/google-sheets/src has
 * `createHabit_()`/`getAllHabits_()` only) — this layout is a reasonable
 * minimal design, not a port. "Streak" is shown without a day/week unit
 * since HABIT_HEADERS's own comment for the column is "consecutive
 * days/weeks" (`00_Constants.gs`) — Frequency decides which, and this
 * card doesn't guess.
 */
export function HabitCard({
  name,
  frequency,
  streak,
  completedCount,
  targetCount,
  lastDoneLabel,
  checkedInToday,
  onCheckIn,
}: HabitCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-ink-primary">{name}</span>
        <Badge tone="neutral">{frequency}</Badge>
      </div>

      <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
        <Flame className="h-4 w-4" aria-hidden="true" />
        <span>{streak} in a row</span>
      </div>

      {targetCount > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <span>
              {completedCount}/{targetCount} completed
            </span>
          </div>
          <Progress value={(completedCount / targetCount) * 100} />
        </div>
      ) : (
        <span className="text-xs text-ink-secondary">{completedCount} completed</span>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-ink-muted">{lastDoneLabel}</span>
        <Button
          type="button"
          size="sm"
          variant={checkedInToday ? 'secondary' : 'primary'}
          disabled={checkedInToday}
          onClick={onCheckIn}
        >
          {checkedInToday ? 'Checked in today' : 'Check in today'}
        </Button>
      </div>
    </div>
  );
}
