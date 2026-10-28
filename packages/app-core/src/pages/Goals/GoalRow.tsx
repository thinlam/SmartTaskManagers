import type { Goal, Task } from '@stm/types';
import { formatTargetLabel } from '@stm/shared';
import { useTranslation } from 'react-i18next';
import { RowActions } from '../../components/RowActions';
import { GoalCard } from '@stm/ui';
import { translateGoalStatus } from '../../lib/enumLabels';

interface GoalRowProps {
  goal: Goal;
  allTasks: Task[];
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
}

export function GoalRow({ goal, allTasks, onEdit, onDelete }: GoalRowProps) {
  const { t } = useTranslation();
  const linkedTaskCount = allTasks.filter((task) => task.goalId === goal.id).length;

  return (
    <div className="group relative">
      <RowActions
        editLabel={t('goals.editAriaLabel', { name: goal.name })}
        deleteLabel={t('goals.deleteAriaLabel', { name: goal.name })}
        confirmMessage={t('goals.deleteConfirm', { name: goal.name })}
        onEdit={() => onEdit(goal)}
        onDelete={() => onDelete(goal.id)}
      />
      <GoalCard
        name={goal.name}
        area={goal.area}
        targetLabel={formatTargetLabel(goal.targetDate)}
        status={goal.status}
        statusLabel={translateGoalStatus(t, goal.status)}
        progress={goal.progress}
        progressLabel={t('common.percentComplete', { progress: goal.progress })}
        linkedTaskCount={linkedTaskCount}
        linkedTaskCountLabel={
          linkedTaskCount === 0
            ? t('common.noTasksLinked')
            : t('common.tasksLinked', { count: linkedTaskCount })
        }
      />
    </div>
  );
}
