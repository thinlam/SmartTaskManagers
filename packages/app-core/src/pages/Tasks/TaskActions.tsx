import type { Task } from '@stm/types';
import { useState } from 'react';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@stm/ui';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface TaskActionsProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

/**
 * Row actions for the Tasks table. Completing is the common action, so it is always visible;
 * edit and delete show on row hover/focus (always on touch screens) to keep the table calm.
 * Delete asks first because it cannot be undone.
 */
export function TaskActions({ task, onComplete, onDelete, onEdit }: TaskActionsProps) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {task.status !== 'Completed' && (
          <IconButton
            icon={<Check className="h-4 w-4" aria-hidden="true" />}
            aria-label={t('tasks.completeAriaLabel', { title: task.title })}
            onClick={() => onComplete(task.id)}
          />
        )}
        <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
          <IconButton
            icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
            aria-label={t('tasks.editAriaLabel', { title: task.title })}
            onClick={() => onEdit(task)}
          />
          <IconButton
            icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            aria-label={t('tasks.deleteAriaLabel', { title: task.title })}
            variant="danger"
            onClick={() => setConfirming(true)}
          />
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        message={t('tasks.deleteConfirm', { title: task.title })}
        onConfirm={() => {
          setConfirming(false);
          onDelete(task.id);
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
