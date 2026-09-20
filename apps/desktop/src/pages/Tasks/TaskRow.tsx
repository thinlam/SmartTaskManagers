import type { Task } from '@stm/types';
import { formatDueLabel } from '@stm/shared';
import { Check, Trash2 } from 'lucide-react';
import { IconButton, TaskCard } from '@stm/ui';

interface TaskRowProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskRow({ task, onComplete, onDelete }: TaskRowProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <TaskCard
          title={task.title}
          meta={task.area}
          dueLabel={formatDueLabel(task.dueDate)}
          priority={task.priority}
          status={task.status}
          progress={task.progress}
          smartScore={task.smartScore}
          recommendedAction={task.recommendedAction}
        />
      </div>
      {task.status !== 'Completed' && (
        <IconButton
          icon={<Check className="h-4 w-4" aria-hidden="true" />}
          aria-label={`Mark "${task.title}" complete`}
          onClick={() => onComplete(task.id)}
        />
      )}
      <IconButton
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        aria-label={`Delete "${task.title}"`}
        variant="danger"
        onClick={() => onDelete(task.id)}
      />
    </div>
  );
}
