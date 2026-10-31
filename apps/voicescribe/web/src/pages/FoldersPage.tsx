import { useMemo, useState, type FormEvent } from 'react';
import {
  Check,
  ChevronRight,
  Folder as FolderIcon,
  FolderPlus,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { errorText } from '../lib/format';
import {
  ConfirmDialog,
  ErrorNotice,
  Spinner,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../components/ui';
import { useAsync, useToast } from '../state/AppState';
import type { Folder } from '../types';

export function FoldersPage({
  onOpenFolder,
  onChanged,
}: {
  onOpenFolder: (folderId: string) => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const folders = useAsync(() => api.folders.list(), []);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [toDelete, setToDelete] = useState<Folder | null>(null);
  const [deleting, setDeleting] = useState(false);

  const list = folders.data ?? [];
  const totalRecordings = list.reduce((sum, f) => sum + f.recordingCount, 0);
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? list.filter((f) => f.name.toLowerCase().includes(q)) : list;
  }, [list, filter]);

  function closeCreate() {
    setAdding(false);
    setName('');
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.folders.create(name.trim());
      closeCreate();
      folders.reload();
      toast.success('Đã tạo thư mục.');
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setCreating(false);
    }
  }

  async function saveRename(folder: Folder) {
    const next = draft.trim();
    setEditingId(null);
    if (!next || next === folder.name) return;
    try {
      await api.folders.rename(folder.id, next);
      folders.reload();
      onChanged();
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.folders.remove(toDelete.id);
      toast.success('Đã xóa thư mục. Các bản ghi bên trong được giữ lại.');
      setToDelete(null);
      folders.reload();
      onChanged();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Thư mục</h1>
            <p className="mt-1 text-sm text-slate-500">
              {list.length > 0
                ? `${list.length} thư mục · ${totalRecordings} bản ghi`
                : 'Nhóm bản ghi theo chủ đề, dự án hoặc khách hàng.'}
            </p>
          </div>
          {!adding && list.length > 0 && (
            <button onClick={() => setAdding(true)} className={primaryButtonClass}>
              <FolderPlus className="h-4 w-4" /> Thư mục mới
            </button>
          )}
        </div>

        {list.length > 5 && (
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Tìm thư mục..."
              className={`${inputClass} rounded-xl py-2.5 pl-10`}
            />
          </div>
        )}

        <div className="mt-5">
          {folders.error && <ErrorNotice message={folders.error} onRetry={folders.reload} />}
          {folders.loading && !folders.data && <Spinner />}

          {folders.data && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {adding && (
                <form
                  onSubmit={create}
                  className="flex items-center gap-3 border-b border-slate-100 bg-indigo-50/40 px-5 py-3"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <FolderPlus className="h-5 w-5" />
                  </span>
                  <input
                    autoFocus
                    className={inputClass}
                    value={name}
                    maxLength={60}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && closeCreate()}
                    placeholder="Tên thư mục, ví dụ: Họp tuần"
                    aria-label="Tên thư mục mới"
                  />
                  <button
                    type="submit"
                    disabled={creating || !name.trim()}
                    className={`${primaryButtonClass} shrink-0`}
                  >
                    Tạo
                  </button>
                  <button
                    type="button"
                    onClick={closeCreate}
                    className={`${secondaryButtonClass} shrink-0`}
                  >
                    Hủy
                  </button>
                </form>
              )}

              {list.length === 0 && !adding && (
                <div className="px-6 py-16 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <FolderIcon className="h-7 w-7" />
                  </span>
                  <p className="mt-4 font-semibold text-slate-900">Chưa có thư mục nào</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Tạo thư mục để sắp xếp bản ghi gọn gàng hơn.
                  </p>
                  <button onClick={() => setAdding(true)} className={`${primaryButtonClass} mt-5`}>
                    <FolderPlus className="h-4 w-4" /> Tạo thư mục đầu tiên
                  </button>
                </div>
              )}

              {list.length > 0 && visible.length === 0 && (
                <p className="px-6 py-10 text-center text-sm text-slate-400">
                  Không có thư mục nào khớp.
                </p>
              )}

              {visible.map((f) => (
                <div
                  key={f.id}
                  className="group flex items-center gap-4 border-b border-slate-100 px-5 py-3.5 last:border-0 hover:bg-slate-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <FolderIcon className="h-5 w-5" />
                  </span>

                  {editingId === f.id ? (
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      <input
                        autoFocus
                        className={`${inputClass} py-1.5`}
                        value={draft}
                        maxLength={60}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveRename(f);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button
                        onClick={() => void saveRename(f)}
                        aria-label="Lưu tên"
                        className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        aria-label="Hủy"
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onOpenFolder(f.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-slate-900">
                            {f.name}
                          </span>
                          <span className="block text-sm text-slate-400">
                            {f.recordingCount === 0 ? 'Trống' : `${f.recordingCount} bản ghi`}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" />
                      </button>
                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <button
                          onClick={() => {
                            setEditingId(f.id);
                            setDraft(f.name);
                          }}
                          aria-label={`Đổi tên ${f.name}`}
                          title="Đổi tên"
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setToDelete(f)}
                          aria-label={`Xóa ${f.name}`}
                          title="Xóa"
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Xóa thư mục?"
          message={`Thư mục "${toDelete.name}" sẽ bị xóa. ${
            toDelete.recordingCount > 0
              ? `${toDelete.recordingCount} bản ghi bên trong vẫn được giữ lại ở mục "Chưa phân loại".`
              : ''
          }`}
          confirmLabel="Xóa"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
