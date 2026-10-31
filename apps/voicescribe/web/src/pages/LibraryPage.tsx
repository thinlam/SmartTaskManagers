import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileAudio,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '../lib/api';
import { errorText, formatDate, formatDuration, progressPercent } from '../lib/format';
import {
  ConfirmDialog,
  ErrorNotice,
  PageHeader,
  ProgressBar,
  Spinner,
  inputClass,
  primaryButtonClass,
} from '../components/ui';
import { useAsync, useToast } from '../state/AppState';
import type { RecordingSummary } from '../types';

const PAGE_SIZE = 20;
const UNFILED = 'none';

export function LibraryPage({
  initialFolderId,
  onOpenRecording,
  onNewRecording,
  onChanged,
}: {
  initialFolderId?: string;
  onOpenRecording: (id: string) => void;
  onNewRecording: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [folderFilter, setFolderFilter] = useState(initialFolderId ?? '');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<RecordingSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce typing so each keystroke does not hit the server.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(input.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [input]);

  const folders = useAsync(() => api.folders.list(), []);
  const list = useAsync(
    () => api.recordings.list({ q: query, folderId: folderFilter, page, pageSize: PAGE_SIZE }),
    [query, folderFilter, page],
  );

  const data = list.data;
  const hasProcessing = data?.items.some((r) => r.status === 'processing') ?? false;

  // Refresh while any recording is still being transcribed; tell the app when one settles
  // so the sidebar totals update.
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setTimeout(() => {
      list.reload();
      onChanged();
    }, 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProcessing, data]);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const filtering = Boolean(query || folderFilter);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.recordings.remove(toDelete.id);
      toast.success('Đã xóa bản ghi.');
      setToDelete(null);
      onChanged();
      list.reload();
      folders.reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setDeleting(false);
    }
  }

  function chooseFolder(value: string) {
    setFolderFilter(value);
    setPage(1);
  }

  const chips: { value: string; label: string }[] = [
    { value: '', label: 'Tất cả' },
    { value: UNFILED, label: 'Chưa phân loại' },
    ...(folders.data ?? []).map((f) => ({ value: f.id, label: `${f.name} (${f.recordingCount})` })),
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <PageHeader
        title="Thư viện"
        actions={
          <button onClick={onNewRecording} className={primaryButtonClass}>
            <Plus className="h-4 w-4" /> Ghi âm mới
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[280px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tìm theo tiêu đề hoặc nội dung..."
            className={`${inputClass} rounded-xl py-2.5 pl-10 pr-4`}
          />
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.value}
            onClick={() => chooseFolder(c.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              folderFilter === c.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {list.error && <ErrorNotice message={list.error} onRetry={list.reload} />}
      {list.loading && !data && <Spinner />}

      {data && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {data.items.map((r) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenRecording(r.id)}
              onKeyDown={(e) => e.key === 'Enter' && onOpenRecording(r.id)}
              className="group flex cursor-pointer items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  r.status === 'failed'
                    ? 'bg-rose-50 text-rose-500'
                    : r.status === 'processing'
                      ? 'bg-amber-50 text-amber-500'
                      : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                {r.status === 'failed' ? (
                  <AlertCircle className="h-5 w-5" />
                ) : r.status === 'processing' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileAudio className="h-5 w-5" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{r.title}</p>
                {r.status === 'processing' ? (
                  <div className="mt-1.5 flex items-center gap-3">
                    <ProgressBar
                      percent={progressPercent(r.progressDone, r.progressTotal)}
                      className="w-40"
                    />
                    <span className="text-xs text-amber-600">
                      {r.progressTotal > 0
                        ? `Đang xử lý ${progressPercent(r.progressDone, r.progressTotal)}%`
                        : 'Đang chuẩn bị...'}
                    </span>
                  </div>
                ) : r.status === 'failed' ? (
                  <p className="mt-0.5 truncate text-sm text-rose-600">
                    {r.error ?? 'Không xử lý được file này'}
                  </p>
                ) : (
                  <p className="mt-0.5 truncate text-sm text-slate-400">{r.preview || r.fileName}</p>
                )}
              </div>

              <div className="hidden shrink-0 items-center gap-2 text-xs text-slate-500 sm:flex">
                {r.folderName && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">
                    {r.folderName}
                  </span>
                )}
                {r.status === 'done' && r.speakerCount > 1 && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">
                    {r.speakerCount} người nói
                  </span>
                )}
              </div>

              <div className="w-24 shrink-0 text-right text-xs text-slate-500">
                <p>{formatDate(r.createdAt)}</p>
                <p className="mt-0.5 font-mono">
                  {r.status === 'done' ? formatDuration(r.durationSec) : ''}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToDelete(r);
                }}
                aria-label={`Xóa ${r.title}`}
                title="Xóa"
                className="rounded-lg p-2 text-slate-300 opacity-0 hover:bg-rose-50 hover:text-rose-600 focus:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {data.items.length === 0 && (
            <div className="px-6 py-14 text-center text-slate-400">
              {filtering ? (
                'Không tìm thấy bản ghi nào.'
              ) : (
                <>
                  <p>Thư viện còn trống.</p>
                  <button onClick={onNewRecording} className={`${primaryButtonClass} mt-4`}>
                    Tạo bản ghi đầu tiên
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {data && data.total > data.pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            {data.total} bản ghi · Trang {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Xóa bản ghi?"
          message={`"${toDelete.title}" sẽ bị xóa vĩnh viễn, không thể khôi phục.`}
          confirmLabel="Xóa"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
