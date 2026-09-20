import type { TaskSummary } from '@stm/types';
import { Check, Trash2 } from 'lucide-react';
import { IconButton, TaskCard } from '@stm/ui';

interface InboxTaskRowProps {
  task: TaskSummary;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function InboxTaskRow({ task, onComplete, onDelete }: InboxTaskRowProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <TaskCard
          title={task.title}
          meta={task.area}
          dueLabel={task.dueLabel}
          priority={task.priority}
        />
      </div>
      <IconButton
        icon={<Check className="h-4 w-4" aria-hidden="true" />}
        aria-label={`Mark "${task.title}" complete`}
        onClick={() => onComplete(task.id)}
      />
      <IconButton
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        aria-label={`Delete "${task.title}"`}
        variant="danger"
        onClick={() => onDelete(task.id)}
      />
    </div>
  );
}
