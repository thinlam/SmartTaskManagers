import type { Habit } from '@stm/types';
import { Pencil, Trash2 } from 'lucide-react';
import { HabitCard, IconButton } from '@stm/ui';
import { useHabitsContext } from '../../state/HabitsContext';
import { reportError } from '../../lib/reportError';

interface HabitRowProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
}

function formatLastDoneLabel(lastCompletedDate: string | null): string {
  if (!lastCompletedDate) return 'Not checked in yet';

  const today = new Date().toISOString().slice(0, 10);
  if (lastCompletedDate === today) return 'Done today';

  const date = new Date(`${lastCompletedDate}T00:00:00`);
  const formatted = date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  return `Last done ${formatted}`;
}

export function HabitRow({ habit, onEdit, onDelete }: HabitRowProps) {
  const { checkInHabit } = useHabitsContext();
  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = habit.lastCompletedDate === today;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-end gap-1">
        <IconButton
          icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
          aria-label={`Edit "${habit.name}"`}
          size="sm"
          onClick={() => onEdit(habit)}
        />
        <IconButton
          icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          aria-label={`Delete "${habit.name}"`}
          variant="danger"
          size="sm"
          onClick={() => onDelete(habit.id)}
        />
      </div>
      <HabitCard
        name={habit.name}
        frequency={habit.frequency}
        streak={habit.streak}
        completedCount={habit.completedCount}
        targetCount={habit.targetCount}
        lastDoneLabel={formatLastDoneLabel(habit.lastCompletedDate)}
        checkedInToday={checkedInToday}
        onCheckIn={() => checkInHabit(habit.id).catch(reportError)}
      />
    </div>
  );
}
