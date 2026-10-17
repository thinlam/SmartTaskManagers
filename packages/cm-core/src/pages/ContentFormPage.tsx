import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  FileText,
  Image as ImageIcon,
  Radio,
  Trash2,
  Type,
  UploadCloud,
  X,
} from 'lucide-react';
import { api, mediaUrl } from '../api/client';
import {
  CHANNELS,
  PRIORITIES,
  STATUSES,
  type Channel,
  type ContentStatus,
  type MediaAsset,
  type Priority,
} from '../api/types';
import {
  Button,
  Card,
  ChannelIcon,
  ConfirmDialog,
  ErrorState,
  Field,
  Modal,
  PageHeader,
  ProgressBar,
  Select,
  Spinner,
  inputClass,
} from '../components/ui';
import { cn, fmtBytes, fromLocalInput, toLocalInput } from '../lib/format';
import { PRIORITY_META, STATUS_META } from '../lib/meta';
import { errMsg, useAsync, useAuth, useLookups, useToast } from '../state/AppState';

const ACCEPT = '.png,.jpg,.jpeg,.gif,.webp,.mp4,.mov';

interface Form {
  title: string;
  channel: Channel;
  campaignId: string;
  assigneeId: string;
  priority: Priority;
  scheduledAt: string;
  description: string;
  status: ContentStatus;
  media: MediaAsset[];
}

export function ContentFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();
  const { user } = useAuth();
  const { members, campaigns } = useLookups();

  const [form, setForm] = useState<Form>(() => ({
    title: '',
    channel: (params.get('channel') as Channel) || 'Facebook',
    campaignId: '',
    assigneeId: user?.id ?? '',
    priority: 'Medium',
    scheduledAt: toLocalInput(params.get('date')),
    description: '',
    status: (params.get('status') as ContentStatus) || 'Idea',
    media: [],
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [saving, setSaving] = useState<'draft' | 'save' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [picker, setPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const existing = useAsync(() => (id ? api.contents.get(id) : Promise.resolve(null)), [id]);
  useEffect(() => {
    const c = existing.data;
    if (!c) return;
    setForm({
      title: c.title,
      channel: c.channel,
      campaignId: c.campaign?.id ?? '',
      assigneeId: c.assignee?.id ?? '',
      priority: c.priority,
      scheduledAt: toLocalInput(c.scheduledAt),
      description: c.description ?? '',
      status: c.status,
      media: c.media,
    });
  }, [existing.data]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = (strict: boolean) => {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = 'Vui lòng nhập tiêu đề.';
    if (strict) {
      if (!form.assigneeId) e.assigneeId = 'Chọn người phụ trách.';
      if (!form.scheduledAt) e.scheduledAt = 'Chọn ngày đăng.';
      if (!form.description.trim()) e.description = 'Vui lòng nhập mô tả.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (asDraft: boolean) => {
    if (!validate(!asDraft)) return;
    setSaving(asDraft ? 'draft' : 'save');
    try {
      const status = asDraft ? (form.status === 'Idea' ? 'Drafting' : form.status) : form.status;
      const input = {
        title: form.title,
        channel: form.channel,
        description: form.description,
        priority: form.priority,
        status,
        assigneeId: form.assigneeId || null,
        campaignId: form.campaignId || null,
        scheduledAt: fromLocalInput(form.scheduledAt),
        mediaIds: form.media.map((m) => m.id),
      };
      if (editing) await api.contents.update(id!, input);
      else await api.contents.create(input);
      toast.success(
        asDraft ? 'Đã lưu nháp.' : editing ? 'Đã cập nhật nội dung.' : 'Đã thêm nội dung.',
      );
      navigate('/contents');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(null);
    }
  };

  const upload = async (files: FileList | File[]) => {
    const list = [...files];
    if (!list.length) return;
    setUploading(true);
    try {
      const created = await api.media.upload(list);
      setForm((f) => ({ ...f, media: [...f.media, ...created] }));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    try {
      await api.contents.remove(id!);
      toast.success('Đã xóa nội dung.');
      navigate('/contents');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  if (editing && existing.loading && !existing.data) return <Spinner />;
  if (editing && existing.error)
    return <ErrorState message={existing.error} onRetry={existing.reload} />;

  const checklist = [
    { done: !!form.title.trim(), label: 'Đã thêm tiêu đề', icon: Type },
    { done: !!form.channel, label: 'Đã chọn kênh', icon: Radio },
    { done: !!form.scheduledAt, label: 'Đã đặt ngày đăng', icon: CalendarDays },
    { done: !!form.description.trim(), label: 'Đã thêm mô tả', icon: FileText },
  ];
  const progress = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
  const campaign = campaigns.find((c) => c.id === form.campaignId);

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="p-5 md:p-7">
          <PageHeader
            title={editing ? 'Chỉnh sửa nội dung' : 'Tạo nội dung mới'}
            subtitle="Tạo và lên lịch nội dung cho chiến dịch của bạn"
          />

          <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label="Tiêu đề" required error={errors.title}>
              <input
                className={cn(inputClass, errors.title && 'border-bad')}
                placeholder="Nhập tiêu đề nội dung..."
                maxLength={300}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </Field>
            <Field label="Kênh" required>
              <Select
                value={form.channel}
                onChange={(e) => set('channel', e.target.value as Channel)}
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Chiến dịch">
              <Select value={form.campaignId} onChange={(e) => set('campaignId', e.target.value)}>
                <option value="">Không thuộc chiến dịch</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Người phụ trách" required error={errors.assigneeId}>
              <Select value={form.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}>
                <option value="">Chọn người phụ trách</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </Select>
            </Field>

            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold">Mức ưu tiên</legend>
              <div className="grid grid-cols-3 gap-2">
                {[...PRIORITIES].reverse().map((p) => (
                  <label
                    key={p}
                    className={cn(
                      'flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm font-medium transition',
                      form.priority === p
                        ? cn('bg-surface', PRIORITY_META[p].ring, 'ring-2 ring-current/20')
                        : 'border-line-strong text-ink-2 hover:bg-sunken',
                    )}
                  >
                    <input
                      type="radio"
                      name="priority"
                      className="sr-only"
                      checked={form.priority === p}
                      onChange={() => set('priority', p)}
                    />
                    <span className={cn('h-3 w-3 rounded-full border-2', PRIORITY_META[p].ring)} />
                    {PRIORITY_META[p].label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Ngày đăng" required error={errors.scheduledAt}>
              <input
                type="datetime-local"
                className={cn(inputClass, errors.scheduledAt && 'border-bad')}
                value={form.scheduledAt}
                onChange={(e) => set('scheduledAt', e.target.value)}
              />
            </Field>

            <Field label="Mô tả" required error={errors.description} className="md:col-span-2">
              <textarea
                className={cn(inputClass, 'h-28 resize-y py-2', errors.description && 'border-bad')}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Mô tả nội dung, hashtag, call-to-action..."
              />
            </Field>

            <div className="md:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold">Đính kèm media</span>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void upload(e.dataTransfer.files);
                }}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition',
                  dragging ? 'border-brand bg-brand-soft' : 'border-line-strong bg-canvas',
                )}
              >
                <UploadCloud className="h-8 w-8 text-brand" />
                <p className="text-sm">
                  {uploading ? 'Đang tải lên...' : 'Kéo thả tệp hoặc '}
                  {!uploading && (
                    <>
                      <button
                        type="button"
                        className="cursor-pointer font-medium text-brand hover:underline"
                        onClick={() => fileInput.current?.click()}
                      >
                        chọn tệp
                      </button>
                      {' hoặc '}
                      <button
                        type="button"
                        className="cursor-pointer font-medium text-brand hover:underline"
                        onClick={() => setPicker(true)}
                      >
                        chọn từ thư viện media
                      </button>
                    </>
                  )}
                </p>
                <p className="text-xs text-ink-3">PNG, JPG, GIF, WEBP, MP4, MOV (tối đa 100MB)</p>
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) void upload(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>
              {form.media.length > 0 && (
                <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {form.media.map((m) => (
                    <li
                      key={m.id}
                      className="group relative overflow-hidden rounded-md border border-line"
                    >
                      <MediaThumb asset={m} className="h-24 w-full" />
                      <p className="truncate px-2 py-1 text-xs text-ink-2">{m.fileName}</p>
                      <button
                        type="button"
                        aria-label={`Bỏ ${m.fileName}`}
                        onClick={() =>
                          set(
                            'media',
                            form.media.filter((x) => x.id !== m.id),
                          )
                        }
                        className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <div>
              {editing && (
                <Button
                  variant="ghost"
                  className="text-bad hover:bg-bad-soft"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setConfirmDelete(true)}
                >
                  Xóa
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate(-1)}>
                Hủy
              </Button>
              <Button
                variant="secondary"
                loading={saving === 'draft'}
                disabled={saving !== null}
                onClick={() => save(true)}
              >
                Lưu nháp
              </Button>
              <Button
                loading={saving === 'save'}
                disabled={saving !== null}
                onClick={() => save(false)}
              >
                {editing ? 'Lưu thay đổi' : 'Thêm nội dung'}
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Tóm tắt</h2>
            <div className="mb-4 flex items-center gap-3">
              <ChannelIcon channel={form.channel} size={36} />
              <p className="min-w-0 truncate font-semibold">{form.title || 'Chưa có tiêu đề'}</p>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <dt className="text-ink-2">Chiến dịch</dt>
                <dd className="truncate font-medium">{campaign?.name ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <dt className="text-ink-2">Trạng thái</dt>
                <dd className="w-40">
                  <Select
                    className="h-9 text-sm"
                    value={form.status}
                    onChange={(e) => set('status', e.target.value as ContentStatus)}
                    aria-label="Trạng thái"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </Select>
                </dd>
              </div>
              <div className="border-t border-line pt-3">
                <dt className="mb-2 flex justify-between text-ink-2">
                  Tiến độ hoàn thành <span className="font-semibold text-ink">{progress}%</span>
                </dt>
                <dd>
                  <ProgressBar value={progress} />
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-lg font-bold">Checklist</h2>
            <ul className="divide-y divide-line">
              {checklist.map(({ done, label, icon: Icon }) => (
                <li key={label} className="flex items-center gap-3 py-3 text-sm">
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border-2',
                      done ? 'border-ok bg-ok text-white' : 'border-line-strong',
                    )}
                  >
                    {done && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <Icon className="h-4 w-4 text-brand" />
                  <span className={cn(done ? 'text-ink' : 'text-ink-2')}>{label}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <MediaPicker
        open={picker}
        onClose={() => setPicker(false)}
        selectedIds={form.media.map((m) => m.id)}
        onPick={(assets) => {
          setForm((f) => ({
            ...f,
            media: [...f.media, ...assets.filter((a) => !f.media.some((m) => m.id === a.id))],
          }));
          setPicker(false);
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Xóa nội dung"
        message="Bạn có chắc muốn xóa nội dung này? Thao tác này không thể hoàn tác."
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}

export function MediaThumb({ asset, className }: { asset: MediaAsset; className?: string }) {
  if (asset.contentType.startsWith('video/'))
    return (
      <video
        src={mediaUrl(asset.id)}
        className={cn('bg-ink object-cover', className)}
        muted
        preload="metadata"
      />
    );
  if (asset.contentType.startsWith('image/'))
    return (
      <img
        src={mediaUrl(asset.id)}
        alt={asset.fileName}
        loading="lazy"
        className={cn('bg-sunken object-cover', className)}
      />
    );
  return (
    <div className={cn('flex items-center justify-center bg-sunken text-ink-3', className)}>
      <ImageIcon className="h-6 w-6" />
    </div>
  );
}

function MediaPicker({
  open,
  onClose,
  selectedIds,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  onPick: (a: MediaAsset[]) => void;
}) {
  const { data, loading } = useAsync(() => (open ? api.media.list() : Promise.resolve([])), [open]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (open) setChosen(new Set());
  }, [open]);
  const available = (data ?? []).filter((a) => !selectedIds.includes(a.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Chọn từ thư viện media"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            disabled={chosen.size === 0}
            onClick={() => onPick(available.filter((a) => chosen.has(a.id)))}
          >
            Thêm {chosen.size || ''} tệp
          </Button>
        </>
      }
    >
      {loading ? (
        <Spinner />
      ) : available.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-3">Thư viện chưa có tệp nào để chọn.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {available.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                aria-pressed={chosen.has(a.id)}
                onClick={() =>
                  setChosen((s) => {
                    const n = new Set(s);
                    if (n.has(a.id)) n.delete(a.id);
                    else n.add(a.id);
                    return n;
                  })
                }
                className={cn(
                  'w-full cursor-pointer overflow-hidden rounded-md border-2 text-left',
                  chosen.has(a.id) ? 'border-brand' : 'border-line',
                )}
              >
                <MediaThumb asset={a} className="h-24 w-full" />
                <p className="truncate px-2 py-1 text-xs">{a.fileName}</p>
                <p className="px-2 pb-1 text-[11px] text-ink-3">{fmtBytes(a.size)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
