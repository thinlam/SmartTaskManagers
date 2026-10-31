import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Megaphone, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
import { MenuItem, PopoverMenu } from '../components/PopoverMenu';
import { cn, fmtDate } from '../lib/format';
import { CAMPAIGN_STATUS } from '../lib/meta';
import { errMsg, useLookups, usePermissions, useToast } from '../state/AppState';

interface Draft {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
}
const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

const STATUS_ORDER: CampaignStatus[] = ['Active', 'Planned', 'Done'];
const DAY = 86_400_000;

/** One short line about where the campaign stands in time, with a tone for colouring. */
function timeLeft(c: Campaign): { text: string; tone: 'ok' | 'warn' | 'bad' | 'muted' } | null {
  if (c.status === 'Done') return null;
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

const TONE = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', muted: 'text-ink-3' } as const;

export function CampaignsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { canEdit, canDelete } = usePermissions();
  const { campaigns, refresh } = useLookups();
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
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

  /** Quick add: just a name, Enter. Dates and description can be filled in later. */
  const quickCreate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await api.campaigns.create({ name: trimmed, status: 'Planned' });
      await refresh();
      setName('');
      toast.success(`Đã tạo chiến dịch "${trimmed}".`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setAdding(false);
    }
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
      await api.campaigns.update(draft.id, {
        name: draft.name,
        description: draft.description,
        startDate: draft.startDate || null,
        endDate: draft.endDate || null,
        status: draft.status,
      });
      await refresh();
      toast.success('Đã cập nhật chiến dịch.');
      setDraft(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (c: Campaign, status: CampaignStatus) => {
    if (status === c.status) return;
    try {
      await api.campaigns.update(c.id, {
        name: c.name,
        description: c.description ?? '',
        startDate: c.startDate,
        endDate: c.endDate,
        status,
      });
      await refresh();
      toast.success(`Đã chuyển sang "${CAMPAIGN_STATUS[status].label}".`);
    } catch (e) {
      toast.error(errMsg(e));
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
      />

      {canEdit && (
        <form onSubmit={quickCreate} className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Plus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              className={cn(inputClass, 'pl-9')}
              placeholder="Tên chiến dịch mới, nhấn Enter để tạo"
              aria-label="Tên chiến dịch mới"
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" loading={adding} disabled={!name.trim()}>
            Tạo
          </Button>
        </form>
      )}

      {campaigns.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
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
          {campaigns.length > 6 && (
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
            hint={
              canEdit
                ? 'Nhập tên vào ô phía trên rồi nhấn Enter để tạo chiến dịch đầu tiên.'
                : 'Chưa có chiến dịch nào được tạo.'
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
        <Card className="divide-y divide-line">
          {visible.map((c) => {
            const pct = c.contentCount ? Math.round((c.publishedCount / c.contentCount) * 100) : 0;
            const left = timeLeft(c);
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 md:px-5"
              >
                <div className="min-w-0 flex-1 basis-56">
                  <button
                    type="button"
                    onClick={() => navigate(`/contents?campaign=${c.id}`)}
                    title="Xem nội dung của chiến dịch"
                    className="block max-w-full cursor-pointer truncate text-left font-semibold hover:text-brand"
                  >
                    {c.name}
                  </button>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                    <span>
                      {c.startDate || c.endDate
                        ? `${c.startDate ? fmtDate(c.startDate) : '…'} → ${c.endDate ? fmtDate(c.endDate) : '…'}`
                        : 'Chưa đặt thời gian'}
                    </span>
                    {left && (
                      <span className={cn('font-semibold', TONE[left.tone])}>{left.text}</span>
                    )}
                  </p>
                </div>

                <div className="w-44 shrink-0">
                  <div className="mb-1 flex justify-between text-xs text-ink-2">
                    <span>
                      {c.contentCount === 0
                        ? 'Chưa có nội dung'
                        : `${c.publishedCount}/${c.contentCount} đã đăng`}
                    </span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} />
                </div>

                {!canEdit ? (
                  <Pill className={CAMPAIGN_STATUS[c.status].badge}>
                    {CAMPAIGN_STATUS[c.status].label}
                  </Pill>
                ) : (
                  <PopoverMenu
                    width={168}
                    align="end"
                    trigger={(t) => (
                      <button
                        {...t}
                        type="button"
                        aria-label={`Đổi trạng thái ${c.name}`}
                        title="Đổi trạng thái"
                        className="cursor-pointer rounded-full hover:ring-2 hover:ring-brand/20"
                      >
                        <Pill className={CAMPAIGN_STATUS[c.status].badge}>
                          {CAMPAIGN_STATUS[c.status].label}
                        </Pill>
                      </button>
                    )}
                  >
                    {(close) =>
                      STATUS_ORDER.map((s) => (
                        <MenuItem
                          key={s}
                          selected={s === c.status}
                          onClick={() => {
                            close();
                            void setStatus(c, s);
                          }}
                        >
                          {CAMPAIGN_STATUS[s].label}
                          {s === c.status && (
                            <Check className="ml-auto inline h-4 w-4 text-brand" />
                          )}
                        </MenuItem>
                      ))
                    }
                  </PopoverMenu>
                )}

                {canEdit && (
                  <PopoverMenu
                    width={176}
                    align="end"
                    trigger={(t) => (
                      <button
                        {...t}
                        type="button"
                        aria-label={`Tùy chọn ${c.name}`}
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-3 hover:bg-sunken"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    )}
                  >
                    {(close) => (
                      <>
                        <MenuItem
                          icon={<Pencil className="h-4 w-4" />}
                          onClick={() => {
                            close();
                            edit(c);
                          }}
                        >
                          Sửa chi tiết
                        </MenuItem>
                        {canDelete && (
                          <MenuItem
                            danger
                            icon={<Trash2 className="h-4 w-4" />}
                            onClick={() => {
                              close();
                              setToDelete(c);
                            }}
                          >
                            Xóa
                          </MenuItem>
                        )}
                      </>
                    )}
                  </PopoverMenu>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title="Sửa chiến dịch"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Hủy
            </Button>
            <Button loading={saving} onClick={save}>
              Lưu thay đổi
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
                {STATUS_ORDER.map((s) => (
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
