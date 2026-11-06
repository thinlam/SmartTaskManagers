import { CheckCircle2, X, XCircle } from 'lucide-react';

export type ToastVariant = 'success' | 'error';

export interface ToastData {
  id: string;
  variant: ToastVariant;
  message: string;
}

export interface ToastStackProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'border-success/30 bg-success-soft text-success',
  error: 'border-danger/30 bg-danger-soft text-danger',
};

const VARIANT_ICON: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
};

/**
 * Fixed bottom-right toast stack. Purely presentational — the owning app
 * supplies `toasts` and reacts to `onDismiss`; see app-core's ToastContext
 * for the piece that owns the queue, the 4s auto-dismiss timer, and the
 * module-level bus that non-component code (reportError) pushes onto.
 */
export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {toasts.map((toast) => {
        const Icon = VARIANT_ICON[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border px-4 py-3 shadow-lg ${VARIANT_CLASSES[toast.variant]}`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
