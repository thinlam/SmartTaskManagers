import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@stm/ui';

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app replacement for `window.confirm`, which looks different on every shell
 * (browser, Tauri, Android WebView) and may not show at all. Escape or a click
 * outside cancels; focus starts on Cancel so Enter never deletes by accident.
 */
export function ConfirmDialog({
  open,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-primary/40" onClick={onCancel} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        className="relative flex w-full max-w-sm flex-col gap-5 rounded-xl bg-surface p-5 shadow-lg"
      >
        <p className="text-sm text-ink-primary">{message}</p>
        <div className="flex justify-end gap-2">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button className="bg-danger hover:bg-danger/90" onClick={onConfirm}>
            {confirmLabel ?? t('common.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}
