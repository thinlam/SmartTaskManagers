import type { Goal, Task } from '@stm/types';
import { formatTargetLabel } from '@stm/shared';
import { Pencil, Trash2 } from 'lucide-react';
import { GoalCard, IconButton } from '@stm/ui';

interface GoalRowProps {
  goal: Goal;
  allTasks: Task[];
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
}

export function GoalRow({ goal, allTasks, onEdit, onDelete }: GoalRowProps) {
  const linkedTaskCount = allTasks.filter((task) => task.goalId === goal.id).length;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-end gap-1">
        <IconButton
          icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
          aria-label={`Edit "${goal.name}"`}
          size="sm"
          onClick={() => onEdit(goal)}
        />
        <IconButton
          icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          aria-label={`Delete "${goal.name}"`}
          variant="danger"
          size="sm"
          onClick={() => onDelete(goal.id)}
        />
      </div>
      <GoalCard
        name={goal.name}
        area={goal.area}
        targetLabel={formatTargetLabel(goal.targetDate)}
        status={goal.status}
        progress={goal.progress}
        linkedTaskCount={linkedTaskCount}
      />
    </div>
  );
}
