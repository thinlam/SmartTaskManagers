import type { Habit } from '@stm/types';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { HabitCard, IconButton } from '@stm/ui';
import { useHabitsContext } from '../../state/HabitsContext';
import { reportError } from '../../lib/reportError';

interface HabitRowProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
}

function formatLastDoneLabel(lastCompletedDate: string | null, t: TFunction): string {
  if (!lastCompletedDate) return t('habits.notCheckedInYet');

  const today = new Date().toISOString().slice(0, 10);
  if (lastCompletedDate === today) return t('habits.doneToday');

  const date = new Date(`${lastCompletedDate}T00:00:00`);
  const formatted = date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  return t('habits.lastDone', { date: formatted });
}

export function HabitRow({ habit, onEdit, onDelete }: HabitRowProps) {
  const { t } = useTranslation();
  const { checkInHabit } = useHabitsContext();
  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = habit.lastCompletedDate === today;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-end gap-1">
        <IconButton
          icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
          aria-label={t('habits.editAriaLabel', { name: habit.name })}
          size="sm"
          onClick={() => onEdit(habit)}
        />
        <IconButton
          icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          aria-label={t('habits.deleteAriaLabel', { name: habit.name })}
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
        lastDoneLabel={formatLastDoneLabel(habit.lastCompletedDate, t)}
        checkedInToday={checkedInToday}
        onCheckIn={() => checkInHabit(habit.id).catch(reportError)}
      />
    </div>
  );
}
