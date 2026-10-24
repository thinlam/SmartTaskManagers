import { useState, type FormEvent } from 'react';
import { Check, Folder as FolderIcon, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { errorText } from '../lib/format';
import {
  Card,
  ConfirmDialog,
  ErrorNotice,
  PageHeader,
  Spinner,
  inputClass,
  primaryButtonClass,
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
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [toDelete, setToDelete] = useState<Folder | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.folders.create(name.trim());
      setName('');
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
      <PageHeader title="Thư mục" subtitle="Nhóm các bản ghi theo chủ đề, dự án hoặc khách hàng." />

      <form onSubmit={create} className="mb-6 flex max-w-xl gap-2">
        <input
          className={inputClass}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên thư mục mới"
          aria-label="Tên thư mục mới"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className={`${primaryButtonClass} shrink-0`}
        >
          <Plus className="h-4 w-4" /> Tạo
        </button>
      </form>

      {folders.error && <ErrorNotice message={folders.error} onRetry={folders.reload} />}
      {folders.loading && !folders.data && <Spinner />}

      {folders.data && folders.data.length === 0 && (
        <Card className="max-w-xl text-center text-sm text-slate-400">
          Chưa có thư mục nào. Tạo thư mục đầu tiên ở ô phía trên.
        </Card>
      )}

      {folders.data && folders.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {folders.data.map((f) => (
            <div key={f.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <FolderIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  {editingId === f.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        className={`${inputClass} py-1`}
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
                    <button
                      onClick={() => onOpenFolder(f.id)}
                      className="block max-w-full truncate text-left font-semibold text-slate-900 hover:text-indigo-600"
                    >
                      {f.name}
                    </button>
                  )}
                  <p className="mt-0.5 text-sm text-slate-400">{f.recordingCount} bản ghi</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-1">
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
            </div>
          ))}
        </div>
      )}

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
