import type { HabitFrequency } from '@stm/types';
import { Flame } from 'lucide-react';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Progress } from '../Progress';

export interface HabitCardProps {
  name: string;
  frequency: HabitFrequency;
  /** Translated frequency text — falls back to the raw enum value when omitted. */
  frequencyLabel?: string;
  streak: number;
  /** Translated "N in a row" text — falls back to English when omitted. */
  streakLabel?: string;
  completedCount: number;
  /** 0 = no target set — hides the progress bar. */
  targetCount: number;
  /** Translated "N/M completed" or "N completed" text — falls back to English when omitted. */
  completedLabel?: string;
  lastDoneLabel: string;
  checkedInToday: boolean;
  onCheckIn: () => void;
  /** Translated check-in button text — falls back to English when omitted. */
  checkInButtonLabel?: string;
  /** Translated "already checked in" button text — falls back to English when omitted. */
  checkedInButtonLabel?: string;
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
  frequencyLabel,
  streak,
  streakLabel,
  completedCount,
  targetCount,
  completedLabel,
  lastDoneLabel,
  checkedInToday,
  onCheckIn,
  checkInButtonLabel = 'Check in today',
  checkedInButtonLabel = 'Checked in today',
}: HabitCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-ink-primary">{name}</span>
        <Badge tone="neutral">{frequencyLabel ?? frequency}</Badge>
      </div>

      <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
        <Flame className="h-4 w-4" aria-hidden="true" />
        <span>{streakLabel ?? `${streak} in a row`}</span>
      </div>

      {targetCount > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <span>{completedLabel ?? `${completedCount}/${targetCount} completed`}</span>
          </div>
          <Progress value={(completedCount / targetCount) * 100} />
        </div>
      ) : (
        <span className="text-xs text-ink-secondary">
          {completedLabel ?? `${completedCount} completed`}
        </span>
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
          {checkedInToday ? checkedInButtonLabel : checkInButtonLabel}
        </Button>
      </div>
    </div>
  );
}
