import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { errorText, formatDate, formatDuration } from '../lib/format';
import {
  ConfirmDialog,
  ErrorNotice,
  PageHeader,
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
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tìm theo tiêu đề hoặc nội dung..."
          className={`${inputClass} min-w-[280px] flex-1 rounded-xl px-4 py-2.5`}
        />
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
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-semibold">Tiêu đề</th>
                <th className="px-6 py-3 font-semibold">Thư mục</th>
                <th className="px-6 py-3 font-semibold">Ngày</th>
                <th className="px-6 py-3 font-semibold">Thời lượng</th>
                <th className="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => onOpenRecording(r.id)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{r.title}</p>
                    <p className="mt-0.5 max-w-xl truncate text-slate-400">{r.preview || r.fileName}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{r.folderName ?? '—'}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(r.createdAt)}</td>
                  <td className="px-6 py-4 font-mono text-slate-600">{formatDuration(r.durationSec)}</td>
                  <td className="px-3 py-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setToDelete(r);
                      }}
                      aria-label={`Xóa ${r.title}`}
                      title="Xóa"
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-slate-400">
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
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
