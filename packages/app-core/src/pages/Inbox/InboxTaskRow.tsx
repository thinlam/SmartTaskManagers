import type { Task } from '@stm/types';
import { formatDueLabel } from '@stm/shared';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton, TaskCard } from '@stm/ui';
import { translatePriority } from '../../lib/enumLabels';

interface InboxTaskRowProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

export function InboxTaskRow({ task, onComplete, onDelete, onEdit }: InboxTaskRowProps) {
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
        />
      </div>
      <IconButton
        icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
        aria-label={t('inbox.editAriaLabel', { title: task.title })}
        onClick={() => onEdit(task)}
      />
      <IconButton
        icon={<Check className="h-4 w-4" aria-hidden="true" />}
        aria-label={t('inbox.completeAriaLabel', { title: task.title })}
        onClick={() => onComplete(task.id)}
      />
      <IconButton
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        aria-label={t('inbox.deleteAriaLabel', { title: task.title })}
        variant="danger"
        onClick={() => onDelete(task.id)}
      />
    </div>
  );
}
