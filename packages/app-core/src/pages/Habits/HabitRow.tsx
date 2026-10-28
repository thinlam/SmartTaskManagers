import type { Habit } from '@stm/types';
import { useTranslation } from 'react-i18next';
import { RowActions } from '../../components/RowActions';
import type { TFunction } from 'i18next';
import { HabitCard } from '@stm/ui';
import { translateHabitFrequency } from '../../lib/enumLabels';
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
  const formatted = date.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' });
  return t('habits.lastDone', { date: formatted });
}

export function HabitRow({ habit, onEdit, onDelete }: HabitRowProps) {
  const { t } = useTranslation();
  const { checkInHabit } = useHabitsContext();
  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = habit.lastCompletedDate === today;

  return (
    <div className="group relative">
      <RowActions
        editLabel={t('habits.editAriaLabel', { name: habit.name })}
        deleteLabel={t('habits.deleteAriaLabel', { name: habit.name })}
        confirmMessage={t('habits.deleteConfirm', { name: habit.name })}
        onEdit={() => onEdit(habit)}
        onDelete={() => onDelete(habit.id)}
      />
      <HabitCard
        name={habit.name}
        frequency={habit.frequency}
        frequencyLabel={translateHabitFrequency(t, habit.frequency)}
        streak={habit.streak}
        streakLabel={t('common.streakInARow', { streak: habit.streak })}
        completedCount={habit.completedCount}
        targetCount={habit.targetCount}
        completedLabel={
          habit.targetCount > 0
            ? t('common.completedOfTarget', {
                completed: habit.completedCount,
                target: habit.targetCount,
              })
            : t('common.completedCount', { completed: habit.completedCount })
        }
        lastDoneLabel={formatLastDoneLabel(habit.lastCompletedDate, t)}
        checkedInToday={checkedInToday}
        onCheckIn={() => checkInHabit(habit.id).catch(reportError)}
        checkInButtonLabel={t('common.checkInToday')}
        checkedInButtonLabel={t('common.checkedInToday')}
      />
    </div>
  );
}
