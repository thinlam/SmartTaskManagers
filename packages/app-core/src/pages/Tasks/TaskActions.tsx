import type { Task } from '@stm/types';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@stm/ui';

interface TaskActionsProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

/** Edit/Complete/Delete row actions for the Tasks table — extracted from the old TaskCard-based TaskRow so the Frame 05 table can use the same three actions in a dense cell. */
export function TaskActions({ task, onComplete, onDelete, onEdit }: TaskActionsProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-end gap-1">
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
