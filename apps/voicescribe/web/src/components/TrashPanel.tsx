import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Trash2, X } from 'lucide-react';
import type { TrashedSegment } from '../types';
import { displayName } from '../lib/transcript';
import { isPastAutoPurgeAge, TRASH_AUTO_PURGE_DAYS } from '../lib/trash';
import { ConfirmDialog, secondaryButtonClass } from './ui';

const AUTO_PURGE_PREF_KEY = 'voicescribe.trashAutoPurgeReminder';

function loadAutoPurgePref(): boolean {
  try {
    return localStorage.getItem(AUTO_PURGE_PREF_KEY) !== 'off';
  } catch {
    return true;
  }
}

function saveAutoPurgePref(enabled: boolean) {
  try {
    localStorage.setItem(AUTO_PURGE_PREF_KEY, enabled ? 'on' : 'off');
  } catch {
    /* preference just won't persist */
  }
}

function formatDeletedAt(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Thùng rác (Việc 2 trong kế hoạch): danh sách đoạn đã xóa mềm cho một bản
 * ghi, với khôi phục / xóa vĩnh viễn (luôn phải xác nhận) và nhắc tự dọn sau
 * 30 ngày — chỉ là một nhắc nhở có thể tắt, không bao giờ tự xóa âm thầm.
 */
export function TrashPanel({
  trash,
  speakerNames,
  onClose,
  onRestore,
  onPermanentlyDelete,
}: {
  trash: TrashedSegment[];
  speakerNames: Record<string, string>;
  onClose: () => void;
  onRestore: (ids: string[]) => void;
  onPermanentlyDelete: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);
  const [autoPurgeReminder, setAutoPurgeReminder] = useState(loadAutoPurgePref);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea)$/i.test(target.tagName)) return;
      if (e.key === 'Delete' && selected.size > 0) {
        setConfirmDeleteIds([...selected]);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  const overdue = useMemo(() => trash.filter((t) => isPastAutoPurgeAge(t)), [trash]);
  const sorted = useMemo(
    () => [...trash].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)),
    [trash],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === sorted.length ? new Set() : new Set(sorted.map((t) => t.id))));
  }

  function restoreSelected() {
    onRestore([...selected]);
    setSelected(new Set());
  }

  function confirmPermanentDelete() {
    if (!confirmDeleteIds) return;
    onPermanentlyDelete(confirmDeleteIds);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of confirmDeleteIds) next.delete(id);
      return next;
    });
    setConfirmDeleteIds(null);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Thùng rác"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4 pb-[max(1rem,var(--sab))] pt-[max(1rem,var(--sat))]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Thùng rác</h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {autoPurgeReminder && overdue.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 bg-amber-50 px-5 py-2.5 text-sm text-amber-800">
            <span>
              Có {overdue.length} đoạn đã quá {TRASH_AUTO_PURGE_DAYS} ngày trong thùng rác.
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmDeleteIds(overdue.map((t) => t.id))}
                className="font-semibold text-amber-900 hover:underline"
              >
                Xóa vĩnh viễn ngay
              </button>
              <button
                onClick={() => {
                  setAutoPurgeReminder(false);
                  saveAutoPurgePref(false);
                }}
                className="text-amber-700 hover:underline"
              >
                Đừng nhắc nữa
              </button>
            </div>
          </div>
        )}

        {sorted.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">Thùng rác trống.</p>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-2.5 text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={selected.size === sorted.length}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Chọn tất cả ({sorted.length})
              </label>
              {selected.size > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={restoreSelected}
                    className="flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Khôi phục ({selected.size})
                  </button>
                  <button
                    onClick={() => setConfirmDeleteIds([...selected])}
                    className="flex items-center gap-1 font-medium text-rose-600 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xóa vĩnh viễn
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {sorted.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono">
                        {Math.floor(item.segment.start / 60)}:
                        {String(Math.floor(item.segment.start % 60)).padStart(2, '0')}
                      </span>
                      <span>·</span>
                      <span className="font-medium text-slate-500">
                        {displayName(speakerNames, item.segment.speaker)}
                      </span>
                      <span>·</span>
                      <span>Đã xóa {formatDeletedAt(item.deletedAt)}</span>
                      {isPastAutoPurgeAge(item) && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
                          Quá {TRASH_AUTO_PURGE_DAYS} ngày
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-700">{item.segment.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button
                onClick={() => setConfirmDeleteIds(sorted.map((t) => t.id))}
                className={secondaryButtonClass}
              >
                Dọn sạch thùng rác
              </button>
            </div>
          </>
        )}
      </div>

      {confirmDeleteIds && (
        <ConfirmDialog
          title="Xóa vĩnh viễn?"
          message={`Xóa vĩnh viễn ${confirmDeleteIds.length} đoạn? Không thể khôi phục.`}
          confirmLabel="Xóa vĩnh viễn"
          onConfirm={confirmPermanentDelete}
          onCancel={() => setConfirmDeleteIds(null)}
        />
      )}
    </div>
  );
}
