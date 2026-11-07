import { useCallback, useEffect, useRef, useState } from 'react';
import { ToastStack, type ToastData } from '@stm/ui';
import { subscribeToast, type ToastInput } from '../lib/toastBus';

const AUTO_DISMISS_MS = 4000;
let nextId = 0;

/**
 * Mounted once in AppShell. Subscribes to the toastBus and renders
 * whatever's queued; each toast auto-dismisses after AUTO_DISMISS_MS
 * unless the user dismisses it first.
 */
export function ToastHost() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  useEffect(() => {
    return subscribeToast((toast: ToastInput) => {
      const id = String(nextId++);
      setToasts((previous) => [...previous, { ...toast, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      );
    });
  }, [dismiss]);

  useEffect(() => {
    return () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
    };
  }, []);

  return <ToastStack toasts={toasts} onDismiss={dismiss} />;
}
