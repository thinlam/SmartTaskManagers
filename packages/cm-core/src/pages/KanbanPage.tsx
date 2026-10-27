import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Plus,
} from 'lucide-react';
import { api } from '../api/client';
import { CHANNELS, STATUSES, type Content, type ContentStatus } from '../api/types';
import { Avatar, ChannelIcon, ErrorState, PageHeader, Select, Spinner } from '../components/ui';
import { MenuItem, PopoverMenu } from '../components/PopoverMenu';
import { cn, fmtShortDate, isOverdue } from '../lib/format';
import { PRIORITY_META, STATUS_META } from '../lib/meta';
import { errMsg, useAsync, useLookups, useToast } from '../state/AppState';

export function KanbanPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { members, campaigns } = useLookups();
  const [channel, setChannel] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  const { data, error, loading, reload, setData } = useAsync(
    () =>
      api.contents.list({
        channel: (channel || undefined) as never,
        campaignId: campaignId || undefined,
        assigneeId: assigneeId || undefined,
        sort: 'scheduled',
        pageSize: 500,
      }),
    [channel, campaignId, assigneeId],
  );

  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ContentStatus | null>(null);
  const filtered = !!(channel || campaignId || assigneeId);

  const columns = useMemo(() => {
    const map = new Map<ContentStatus, Content[]>(STATUSES.map((s) => [s, []]));
    data?.items.forEach((c) => map.get(c.status)?.push(c));
    return map;
  }, [data]);

  const move = async (id: string, status: ContentStatus) => {
    const prev = data;
    const card = data?.items.find((c) => c.id === id);
    if (!prev || !card || card.status === status) return;
    // Optimistic: move the card now, roll back if the server rejects it.
    setData({ ...prev, items: prev.items.map((c) => (c.id === id ? { ...c, status } : c)) });
    try {
      const updated = await api.contents.setStatus(id, status);
      setData({ ...prev, items: prev.items.map((c) => (c.id === id ? updated : c)) });
      toast.success(`Đã chuyển sang "${STATUS_META[status].label}".`);
    } catch (e) {
      setData(prev);
      toast.error(errMsg(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Kanban"
        subtitle="Kéo thẻ sang cột khác, hoặc bấm ⋯ trên thẻ để chuyển trạng thái"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          className="w-40"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          aria-label="Lọc kênh"
        >
          <option value="">Tất cả kênh</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          className="w-48"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          aria-label="Lọc chiến dịch"
        >
          <option value="">Tất cả chiến dịch</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-52"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          aria-label="Lọc người phụ trách"
        >
          <option value="">Tất cả người phụ trách</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </Select>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setChannel('');
              setCampaignId('');
              setAssigneeId('');
            }}
            className="cursor-pointer text-sm font-medium text-brand hover:underline"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <Spinner />
      ) : (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 md:-mx-6 md:px-6">
          {STATUSES.map((status) => {
            const cards = columns.get(status) ?? [];
            const over = overCol === status && dragId !== null;
            return (
              <section
                key={status}
                aria-label={STATUS_META[status].label}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (overCol !== status) setOverCol(status);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('text/plain') || dragId;
                  setOverCol(null);
                  setDragId(null);
                  if (id) void move(id, status);
                }}
                className={cn(
                  'flex w-[268px] shrink-0 flex-col rounded-lg border p-2.5 transition-colors',
                  over ? 'border-brand bg-brand-soft' : 'border-transparent bg-sunken/70',
                )}
              >
                <header className="mb-2.5 flex items-center justify-between px-1">
                  <h2 className="flex items-center gap-2 text-sm font-bold">
                    <span className={cn('h-2.5 w-2.5 rounded-full', STATUS_META[status].dot)} />
                    {STATUS_META[status].label}
                    <span className="rounded-full bg-surface px-2 text-xs font-semibold text-ink-2">
                      {cards.length}
                    </span>
                  </h2>
                  <button
                    type="button"
                    aria-label={`Thêm nội dung vào ${STATUS_META[status].label}`}
                    title="Thêm nội dung"
                    onClick={() => navigate(`/contents/new?status=${status}`)}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-ink-2 hover:bg-surface"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </header>

                <div className="flex min-h-28 flex-1 flex-col gap-2.5">
                  {cards.map((c) => (
                    <KanbanCard
                      key={c.id}
                      c={c}
                      dragging={dragId === c.id}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', c.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDragId(c.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCol(null);
                      }}
                      onOpen={() => navigate(`/contents/${c.id}`)}
                      onMove={(s) => void move(c.id, s)}
                    />
                  ))}
                  {cards.length === 0 && (
                    <div
                      className={cn(
                        'flex flex-1 items-center justify-center rounded-md border-2 border-dashed px-3 py-6 text-center text-xs',
                        over ? 'border-brand text-brand' : 'border-line-strong text-ink-3',
                      )}
                    >
                      {over ? 'Thả vào đây' : 'Chưa có nội dung'}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function KanbanCard({
  c,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
  onMove,
}: {
  c: Content;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onOpen: () => void;
  onMove: (s: ContentStatus) => void;
}) {
  const overdue = isOverdue(c);
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative cursor-grab rounded-md border border-line bg-surface p-3 shadow-card transition hover:border-brand-line active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-2.5">
        <ChannelIcon channel={c.channel} size={26} />
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 cursor-pointer text-left text-sm font-semibold leading-snug hover:text-brand"
        >
          <span className="line-clamp-2">{c.title}</span>
        </button>
        <PopoverMenu
          align="end"
          width={196}
          trigger={(t) => (
            <button
              {...t}
              type="button"
              aria-label="Tùy chọn thẻ"
              className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-3 opacity-0 hover:bg-sunken focus:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
        >
          {(close) => (
            <>
              <p className="flex items-center gap-1.5 px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                <ArrowRightLeft className="h-3 w-3" /> Chuyển sang
              </p>
              {STATUSES.filter((s) => s !== c.status).map((s) => (
                <MenuItem
                  key={s}
                  icon={<span className={cn('h-2 w-2 rounded-full', STATUS_META[s].dot)} />}
                  onClick={() => {
                    close();
                    onMove(s);
                  }}
                >
                  {STATUS_META[s].label}
                </MenuItem>
              ))}
              <div className="my-1 border-t border-line" />
              <MenuItem
                icon={<Pencil className="h-4 w-4" />}
                onClick={() => {
                  close();
                  onOpen();
                }}
              >
                Mở và chỉnh sửa
              </MenuItem>
            </>
          )}
        </PopoverMenu>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <Avatar name={c.assignee?.fullName ?? '?'} size="sm" />
        <span
          className={cn(
            'flex flex-1 items-center gap-1',
            overdue ? 'font-semibold text-bad' : 'text-ink-2',
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {c.status === 'Published'
            ? `Đã đăng ${fmtShortDate(c.publishedAt)}`
            : fmtShortDate(c.scheduledAt)}
        </span>
        {c.status === 'Published' && <CheckCircle2 className="h-4 w-4 text-ok" />}
        {overdue ? (
          <span className="rounded bg-bad-soft px-1.5 py-0.5 text-[11px] font-semibold text-bad">
            Quá hạn
          </span>
        ) : (
          c.priority === 'High' && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                PRIORITY_META.High.badge,
              )}
            >
              Ưu tiên cao
            </span>
          )
        )}
      </div>
    </article>
  );
}
