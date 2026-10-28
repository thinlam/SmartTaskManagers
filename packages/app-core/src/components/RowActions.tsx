import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { IconButton } from '@stm/ui';
import { ConfirmDialog } from './ConfirmDialog';

interface RowActionsProps {
  editLabel: string;
  deleteLabel: string;
  /** Asked before deleting, because it cannot be undone. */
  confirmMessage: string;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Edit/delete for a card. Sits on the card's top edge and only shows on hover or keyboard focus
 * (always on touch screens), so a list of cards is not topped by a row of icons per card.
 * Place inside a wrapper with the `group relative` classes.
 */
export function RowActions({
  editLabel,
  deleteLabel,
  confirmMessage,
  onEdit,
  onDelete,
}: RowActionsProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <div className="absolute -top-4 right-3 z-10 flex gap-0.5 rounded-md border border-border bg-surface p-0.5 opacity-0 shadow-sm transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
        <IconButton
          icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
          aria-label={editLabel}
          size="sm"
          onClick={onEdit}
        />
        <IconButton
          icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          aria-label={deleteLabel}
          variant="danger"
          size="sm"
          onClick={() => setConfirming(true)}
        />
      </div>
      <ConfirmDialog
        open={confirming}
        message={confirmMessage}
        onConfirm={() => {
          setConfirming(false);
          onDelete();
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
