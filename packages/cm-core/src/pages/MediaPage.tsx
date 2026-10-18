import { useEffect, useRef, useState } from 'react';
import { ImageOff, Search, Trash2, UploadCloud } from 'lucide-react';
import { api, mediaUrl } from '../api/client';
import type { MediaAsset } from '../api/types';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  ProgressBar,
  Spinner,
  inputClass,
} from '../components/ui';
import { cn, fmtBytes, fmtDate } from '../lib/format';
import { errMsg, useAsync, useToast } from '../state/AppState';
import { MediaThumb } from './ContentFormPage';

export function MediaPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [type, setType] = useState<'' | 'image' | 'video'>('');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const [toDelete, setToDelete] = useState<MediaAsset | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDq(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, error, loading, reload } = useAsync(
    () => api.media.list({ q: dq || undefined, type: type || undefined }),
    [dq, type],
  );
  const usage = useAsync(() => api.media.usage(), [data?.length]);

  const upload = async (files: FileList | File[]) => {
    const list = [...files];
    if (!list.length) return;
    setUploading(true);
    try {
      await api.media.upload(list);
      toast.success(`Đã tải lên ${list.length} tệp.`);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.media.remove(toDelete.id);
      toast.success('Đã xóa tệp.');
      setToDelete(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const pct = usage.data ? Math.min(100, (usage.data.usedBytes / usage.data.limitBytes) * 100) : 0;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void upload(e.dataTransfer.files);
      }}
      className={cn('min-h-full rounded-lg', dragging && 'outline-2 outline-dashed outline-brand')}
    >
      <PageHeader
        title="Thư viện media"
        subtitle="Ảnh và video dùng cho nội dung. Kéo thả tệp vào đây để tải lên."
        actions={
          <Button
            loading={uploading}
            icon={<UploadCloud className="h-4 w-4" />}
            onClick={() => input.current?.click()}
          >
            Tải lên
          </Button>
        }
      />
      <input
        ref={input}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.mov"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void upload(e.target.files);
          e.target.value = '';
        }}
      />

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-3 md:p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            className={cn(inputClass, 'pl-9')}
            placeholder="Tìm theo tên tệp..."
            aria-label="Tìm tệp"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="inline-flex rounded-md border border-line p-0.5 text-sm font-semibold">
          {(
            [
              ['', 'Tất cả'],
              ['image', 'Ảnh'],
              ['video', 'Video'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setType(v)}
              aria-pressed={type === v}
              className={cn(
                'h-9 cursor-pointer rounded-sm px-3',
                type === v ? 'bg-brand-soft text-brand' : 'text-ink-2',
              )}
            >
              {l}
            </button>
          ))}
        </div>
        {usage.data && (
          <div className="w-full text-xs text-ink-2 sm:w-52">
            {fmtBytes(usage.data.usedBytes)} / {fmtBytes(usage.data.limitBytes)}
            <ProgressBar value={pct} className="mt-1" />
          </div>
        )}
      </Card>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <Spinner />
      ) : !data?.length ? (
        <Card>
          <EmptyState
            icon={<ImageOff className="h-8 w-8" />}
            title={q || type ? 'Không tìm thấy tệp phù hợp' : 'Thư viện còn trống'}
            hint={
              q || type
                ? 'Thử đổi từ khóa hoặc bộ lọc.'
                : 'Tải lên ảnh hoặc video để dùng cho nội dung.'
            }
            action={
              !q && !type ? (
                <Button
                  icon={<UploadCloud className="h-4 w-4" />}
                  onClick={() => input.current?.click()}
                >
                  Tải lên
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {data.map((a) => (
            <li key={a.id}>
              <Card className="group overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPreview(a)}
                  className="block w-full cursor-pointer"
                >
                  <MediaThumb asset={a} className="aspect-video w-full" />
                </button>
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" title={a.fileName}>
                      {a.fileName}
                    </p>
                    <p className="text-xs text-ink-3">
                      {fmtBytes(a.size)} · {fmtDate(a.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Xóa ${a.fileName}`}
                    onClick={() => setToDelete(a)}
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-3 hover:bg-bad-soft hover:text-bad"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.fileName ?? ''} wide>
        {preview &&
          (preview.contentType.startsWith('video/') ? (
            <video
              src={mediaUrl(preview.id)}
              controls
              className="max-h-[70vh] w-full rounded-md bg-ink"
            />
          ) : (
            <img
              src={mediaUrl(preview.id)}
              alt={preview.fileName}
              className="mx-auto max-h-[70vh] rounded-md"
            />
          ))}
      </Modal>
      <ConfirmDialog
        open={!!toDelete}
        title="Xóa tệp"
        message={`Xóa "${toDelete?.fileName}" khỏi thư viện? Nội dung đang dùng tệp này sẽ mất đính kèm.`}
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
