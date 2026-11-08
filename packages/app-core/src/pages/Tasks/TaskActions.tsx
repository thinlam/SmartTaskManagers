import type { Task } from '@stm/types';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@stm/ui';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface TaskActionsProps {
  task: Task;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

/**
 * Row actions for the Tasks table. Completing a task happens via the Status column now (no
 * separate checkmark) — edit and delete are always visible with a text label, since hiding
 * them behind hover/icon-only made users think there was no way to edit/delete from the list.
 * Delete asks first because it cannot be undone.
 */
export function TaskActions({ task, onDelete, onEdit }: TaskActionsProps) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
          aria-label={t('tasks.editAriaLabel', { title: task.title })}
          onClick={() => onEdit(task)}
        >
          {t('tasks.editButtonLabel')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger/10"
          leadingIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
          aria-label={t('tasks.deleteAriaLabel', { title: task.title })}
          onClick={() => setConfirming(true)}
        >
          {t('tasks.deleteButtonLabel')}
        </Button>
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
