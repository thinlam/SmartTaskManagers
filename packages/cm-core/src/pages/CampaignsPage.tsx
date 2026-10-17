import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { fmtDate } from '../lib/format';
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

export function CampaignsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { campaigns, refresh } = useLookups();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Campaign | null>(null);

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

  return (
    <>
      <PageHeader
        title="Chiến dịch"
        subtitle="Nhóm nội dung theo chiến dịch truyền thông"
        actions={
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setError('');
              setDraft(EMPTY);
            }}
          >
            Tạo chiến dịch
          </Button>
        }
      />

      {campaigns.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Megaphone className="h-8 w-8" />}
            title="Chưa có chiến dịch nào"
            hint="Tạo chiến dịch để nhóm và theo dõi nội dung."
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => {
            const pct = c.contentCount ? Math.round((c.publishedCount / c.contentCount) * 100) : 0;
            return (
              <li key={c.id}>
                <Card className="flex h-full flex-col p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold leading-snug">{c.name}</h2>
                    <Pill className={CAMPAIGN_STATUS[c.status].badge}>
                      {CAMPAIGN_STATUS[c.status].label}
                    </Pill>
                  </div>
                  <p className="mb-4 line-clamp-2 min-h-10 text-sm text-ink-2">
                    {c.description || 'Chưa có mô tả.'}
                  </p>
                  <p className="mb-3 text-xs text-ink-3">
                    {fmtDate(c.startDate)} → {c.endDate ? fmtDate(c.endDate) : 'Không giới hạn'}
                  </p>
                  <div className="mb-1 flex justify-between text-xs text-ink-2">
                    <span>
                      {c.publishedCount}/{c.contentCount} bài đã đăng
                    </span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} />
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/contents?campaign=${c.id}`)}
                      className="cursor-pointer text-sm font-medium text-brand hover:underline"
                    >
                      Xem nội dung
                    </button>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        className="h-8 w-8 px-0"
                        aria-label={`Sửa ${c.name}`}
                        onClick={() => edit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 px-0 text-bad hover:bg-bad-soft"
                        aria-label={`Xóa ${c.name}`}
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
              Lưu
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Tên chiến dịch" required>
              <input
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
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={!!toDelete}
        title="Xóa chiến dịch"
        message={`Xóa chiến dịch "${toDelete?.name}"? Nội dung thuộc chiến dịch sẽ được giữ lại nhưng không còn gắn chiến dịch.`}
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
