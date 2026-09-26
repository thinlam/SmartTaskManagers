import type { Task } from '@stm/types';
import { formatDueLabel } from '@stm/shared';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton, TaskCard } from '@stm/ui';
import { translatePriority, translateTaskStatus } from '../../lib/enumLabels';

interface TaskRowProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

export function TaskRow({ task, onComplete, onDelete, onEdit }: TaskRowProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <TaskCard
          title={task.title}
          meta={task.area}
          dueLabel={formatDueLabel(task.dueDate)}
          priority={task.priority}
          priorityLabel={translatePriority(t, task.priority)}
          status={task.status}
          statusLabel={translateTaskStatus(t, task.status)}
          progress={task.progress}
          smartScore={task.smartScore}
          recommendedAction={task.recommendedAction}
        />
      </div>
      <IconButton
        icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
        aria-label={t('tasks.editAriaLabel', { title: task.title })}
        onClick={() => onEdit(task)}
      />
      {task.status !== 'Completed' && (
        <IconButton
          icon={<Check className="h-4 w-4" aria-hidden="true" />}
          aria-label={t('tasks.completeAriaLabel', { title: task.title })}
          onClick={() => onComplete(task.id)}
        />
      )}
      <IconButton
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        aria-label={t('tasks.deleteAriaLabel', { title: task.title })}
        variant="danger"
        onClick={() => onDelete(task.id)}
      />
    </div>
  );
}
