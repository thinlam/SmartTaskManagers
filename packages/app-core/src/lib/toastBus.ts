import type { ToastAction, ToastVariant } from '@stm/ui';

export interface ToastInput {
  variant: ToastVariant;
  message: string;
  action?: ToastAction;
}

type Listener = (toast: ToastInput) => void;

const listeners = new Set<Listener>();

/**
 * Module-level pub/sub so plain functions with no component tree access
 * (reportError, called from row-level onClick handlers with no drawer/
 * form around them — see that file's doc comment) can still surface a
 * toast. ToastHost is the one subscriber, mounted once in AppShell.
 */
export function showToast(toast: ToastInput): void {
  for (const listener of listeners) listener(toast);
}

export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
