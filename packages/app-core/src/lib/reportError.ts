import type { ToastAction } from '@stm/ui';
import { ApiError } from '@stm/api-client';
import { showToast } from './toastBus';

/**
 * Quick actions (Complete/Delete/Check-in, and the inline quick-add bars)
 * fire the API call directly from a row's onClick or a bare form submit,
 * with no drawer/form error area to show a message in. Was console-only
 * through Phase 27 — a real bug, reported as "thêm/sửa xong không thấy gì
 * cả": a failed request (network down, duplicate name, validation) left
 * the UI looking exactly like a no-op. Now also pushes a toast so a
 * failure is always visible somewhere.
 */
export function reportError(err: unknown): void {
  const message = err instanceof ApiError ? err.message : 'Đã xảy ra lỗi, vui lòng thử lại.';
  console.error(err instanceof ApiError ? `${err.status}: ${err.message}` : err);
  showToast({ variant: 'error', message });
}

/** Companion to reportError, for the same quick-action call sites, so success isn't silent either. Optional `action` renders a button on the toast (e.g. "Hoàn tác" after a delete). */
export function reportSuccess(message: string, action?: ToastAction): void {
  showToast({ variant: 'success', message, action });
}
