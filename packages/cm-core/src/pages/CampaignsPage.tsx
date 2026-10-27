import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarRange, ChevronRight, Megaphone, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import type { Campaign, CampaignStatus } from '../api/types';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Pill,
  ProgressBar,
  Select,
  inputClass,
} from '../components/ui';
import { cn, fmtDate } from '../lib/format';
import { CAMPAIGN_STATUS } from '../lib/meta';
import { errMsg, useLookups, useToast } from '../state/AppState';

interface Draft {
  id?: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
}
const EMPTY: Draft = { name: '', description: '', startDate: '', endDate: '', status: 'Planned' };
const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

const STATUS_ORDER: CampaignStatus[] = ['Active', 'Planned', 'Done'];
const DAY = 86_400_000;

/** One short line about where the campaign stands in time, with a tone for colouring. */
function timeLeft(c: Campaign): { text: string; tone: 'ok' | 'warn' | 'bad' | 'muted' } | null {
  if (c.status === 'Done') return { text: 'Đã hoàn tất', tone: 'muted' };
  const today = new Date().setHours(0, 0, 0, 0);
  const start = c.startDate ? new Date(c.startDate).setHours(0, 0, 0, 0) : null;
  const end = c.endDate ? new Date(c.endDate).setHours(0, 0, 0, 0) : null;
  if (start !== null && start > today) {
    return { text: `Bắt đầu sau ${Math.ceil((start - today) / DAY)} ngày`, tone: 'muted' };
  }
  if (end === null) return null;
  const left = Math.round((end - today) / DAY);
  if (left < 0) return { text: `Quá hạn ${-left} ngày`, tone: 'bad' };
  if (left === 0) return { text: 'Kết thúc hôm nay', tone: 'warn' };
  return { text: `Còn ${left} ngày`, tone: left <= 7 ? 'warn' : 'ok' };
}

const TONE: Record<'ok' | 'warn' | 'bad' | 'muted', string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
  muted: 'text-ink-3',
};

export function CampaignsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { campaigns, refresh } = useLookups();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Campaign | null>(null);
  const [filter, setFilter] = useState<'' | CampaignStatus>('');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const map: Record<string, number> = { '': campaigns.length };
    for (const c of campaigns) map[c.status] = (map[c.status] ?? 0) + 1;
    return map;
  }, [campaigns]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns
      .filter((c) => (!filter || c.status === filter) && (!q || c.name.toLowerCase().includes(q)))
      .sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
          a.name.localeCompare(b.name, 'vi'),
      );
  }, [campaigns, filter, search]);

  const openCreate = () => {
    setError('');
    setDraft(EMPTY);
  };

  const edit = (c: Campaign) => {
    setError('');
    setDraft({
      id: c.id,
      name: c.name,
      description: c.description ?? '',
      startDate: dateInput(c.startDate),
      endDate: dateInput(c.endDate),
      status: c.status,
    });
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) return setError('Vui lòng nhập tên chiến dịch.');
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate)
      return setError('Ngày kết thúc phải sau ngày bắt đầu.');
    setSaving(true);
    try {
      const input = {
        name: draft.name,
        description: draft.description,
        startDate: draft.startDate || null,
        endDate: draft.endDate || null,
        status: draft.status,
      };
      if (draft.id) await api.campaigns.update(draft.id, input);
      else await api.campaigns.create(input);
      await refresh();
      toast.success(draft.id ? 'Đã cập nhật chiến dịch.' : 'Đã tạo chiến dịch.');
      setDraft(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.campaigns.remove(toDelete.id);
      await refresh();
      toast.success('Đã xóa chiến dịch.');
      setToDelete(null);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const chips: { value: '' | CampaignStatus; label: string }[] = [
    { value: '', label: 'Tất cả' },
    { value: 'Active', label: CAMPAIGN_STATUS.Active.label },
    { value: 'Planned', label: CAMPAIGN_STATUS.Planned.label },
    { value: 'Done', label: CAMPAIGN_STATUS.Done.label },
  ];

  return (
    <>
      <PageHeader
        title="Chiến dịch"
        subtitle={
          campaigns.length
            ? `${campaigns.length} chiến dịch · ${counts.Active ?? 0} đang chạy`
            : 'Nhóm nội dung theo chiến dịch truyền thông'
        }
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Tạo chiến dịch
          </Button>
        }
      />

      {campaigns.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.value || 'all'}
                role="tab"
                type="button"
                aria-selected={filter === chip.value}
                onClick={() => setFilter(chip.value)}
                className={cn(
                  'cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  filter === chip.value
                    ? 'bg-ink text-surface'
                    : 'bg-surface text-ink-2 ring-1 ring-line hover:bg-sunken',
                )}
              >
                {chip.label}
                <span className="ml-1.5 opacity-60">{counts[chip.value] ?? 0}</span>
              </button>
            ))}
          </div>
          {campaigns.length > 4 && (
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input
                className={cn(inputClass, 'pl-9')}
                placeholder="Tìm chiến dịch..."
                aria-label="Tìm chiến dịch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {campaigns.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Megaphone className="h-8 w-8" />}
            title="Chưa có chiến dịch nào"
            hint="Tạo chiến dịch để nhóm nội dung và theo dõi tiến độ đăng bài."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                Tạo chiến dịch đầu tiên
              </Button>
            }
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title="Không có chiến dịch phù hợp"
            hint="Thử chọn trạng thái khác hoặc đổi từ khóa."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setFilter('');
                  setSearch('');
                }}
              >
                Xem tất cả
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => {
            const pct = c.contentCount ? Math.round((c.publishedCount / c.contentCount) * 100) : 0;
            const left = timeLeft(c);
            return (
              <li key={c.id}>
                <Card className="group relative flex h-full flex-col p-5 transition hover:border-brand-line hover:shadow-pop">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold leading-snug">
                      <button
                        type="button"
                        onClick={() => navigate(`/contents?campaign=${c.id}`)}
                        className="cursor-pointer text-left after:absolute after:inset-0 after:content-[''] hover:text-brand"
                      >
                        {c.name}
                      </button>
                    </h2>
                    <Pill className={CAMPAIGN_STATUS[c.status].badge}>
                      {CAMPAIGN_STATUS[c.status].label}
                    </Pill>
                  </div>
                  <p className="mb-4 line-clamp-2 min-h-10 text-sm text-ink-2">
                    {c.description || 'Chưa có mô tả.'}
                  </p>

                  <div className="mb-3 flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-ink-3">
                      <CalendarRange className="h-3.5 w-3.5" />
                      {c.startDate ? fmtDate(c.startDate) : 'Chưa đặt'}
                      {' → '}
                      {c.endDate ? fmtDate(c.endDate) : 'Không giới hạn'}
                    </span>
                    {left && (
                      <span className={cn('font-semibold', TONE[left.tone])}>{left.text}</span>
                    )}
                  </div>

                  <div className="mb-1 flex justify-between text-xs text-ink-2">
                    <span>
                      {c.contentCount === 0
                        ? 'Chưa có nội dung'
                        : `${c.publishedCount}/${c.contentCount} bài đã đăng`}
                    </span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} />

                  <div className="relative z-10 mt-4 flex items-center justify-between border-t border-line pt-3">
                    <span className="flex items-center text-sm font-medium text-brand">
                      Xem nội dung <ChevronRight className="h-4 w-4" />
                    </span>
                    <div className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        className="h-8 w-8 px-0"
                        aria-label={`Sửa ${c.name}`}
                        title="Sửa"
                        onClick={() => edit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 px-0 text-bad hover:bg-bad-soft"
                        aria-label={`Xóa ${c.name}`}
                        title="Xóa"
                        onClick={() => setToDelete(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Sửa chiến dịch' : 'Tạo chiến dịch'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Hủy
            </Button>
            <Button loading={saving} onClick={save}>
              {draft?.id ? 'Lưu thay đổi' : 'Tạo chiến dịch'}
            </Button>
          </>
        }
      >
        {draft && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <Field label="Tên chiến dịch" required>
              <input
                autoFocus
                className={inputClass}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ví dụ: Khai trương tháng 11"
                maxLength={200}
              />
            </Field>
            <Field label="Mô tả">
              <textarea
                className={`${inputClass} h-20 resize-y py-2`}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Mục tiêu hoặc thông điệp chính (không bắt buộc)"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bắt đầu">
                <input
                  type="date"
                  className={inputClass}
                  value={draft.startDate}
                  onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                />
              </Field>
              <Field label="Kết thúc">
                <input
                  type="date"
                  className={inputClass}
                  min={draft.startDate || undefined}
                  value={draft.endDate}
                  onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Trạng thái">
              <Select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as CampaignStatus })}
              >
                {(Object.keys(CAMPAIGN_STATUS) as CampaignStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {CAMPAIGN_STATUS[s].label}
                  </option>
                ))}
              </Select>
            </Field>
            {error && (
              <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
                {error}
              </p>
            )}
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>
        )}
      </Modal>
      <ConfirmDialog
        open={!!toDelete}
        title="Xóa chiến dịch"
        message={`Xóa chiến dịch "${toDelete?.name}"? ${
          toDelete?.contentCount
            ? `${toDelete.contentCount} nội dung bên trong vẫn được giữ lại nhưng không còn gắn chiến dịch.`
            : 'Chiến dịch này chưa có nội dung.'
        }`}
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
