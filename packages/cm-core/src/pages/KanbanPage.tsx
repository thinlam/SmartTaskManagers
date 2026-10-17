import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, MousePointerClick, Plus } from 'lucide-react';
import { api } from '../api/client';
import { CHANNELS, STATUSES, type Content, type ContentStatus } from '../api/types';
import { Avatar, ChannelIcon, ErrorState, PageHeader, Select, Spinner } from '../components/ui';
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
    } catch (e) {
      setData(prev);
      toast.error(errMsg(e));
    }
  };

  return (
    <>
      <PageHeader title="Kanban nội dung" subtitle="Kéo thả để cập nhật trạng thái nội dung" />

      <div className="mb-4 flex flex-wrap gap-2">
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
      </div>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <Spinner />
      ) : (
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:-mx-6 md:px-6">
          {STATUSES.map((status) => {
            const cards = columns.get(status) ?? [];
            const over = overCol === status && dragId !== null;
            return (
              <section
                key={status}
                aria-label={STATUS_META[status].label}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverCol(status);
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
                  'flex w-[280px] shrink-0 snap-start flex-col rounded-lg bg-sunken/70 p-3 transition',
                  over && 'bg-brand-soft ring-2 ring-brand/40',
                )}
              >
                <header className="mb-3 flex items-center justify-between px-1">
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
                    onClick={() => navigate(`/contents/new?status=${status}`)}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-ink-2 hover:bg-surface"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </header>

                <div className="flex min-h-24 flex-1 flex-col gap-3">
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
                  {(cards.length === 0 || over) && (
                    <div
                      className={cn(
                        'flex flex-1 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center text-sm',
                        over ? 'border-brand text-brand' : 'border-line-strong text-ink-3',
                      )}
                    >
                      <MousePointerClick className="h-6 w-6" />
                      Kéo thả nội dung vào đây để chuyển trạng thái
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
        'cursor-grab rounded-md border border-line bg-surface p-3 shadow-card active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full cursor-pointer items-start gap-2.5 text-left"
      >
        <ChannelIcon channel={c.channel} size={28} />
        <span className="text-sm font-semibold leading-snug">{c.title}</span>
      </button>
      <div className="mt-3 flex items-center gap-2 text-xs">
        <Avatar name={c.assignee?.fullName ?? '?'} size="sm" />
        <span className={cn('flex-1', overdue ? 'font-semibold text-bad' : 'text-ink-2')}>
          {c.status === 'Published'
            ? `Đã đăng ${fmtShortDate(c.publishedAt)}`
            : `Hạn ${fmtShortDate(c.scheduledAt)}`}
        </span>
        {c.status === 'Published' && <CheckCircle2 className="h-4 w-4 text-ok" />}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[11px] font-semibold',
            overdue ? 'bg-bad-soft text-bad' : PRIORITY_META[c.priority].badge,
          )}
        >
          {overdue ? 'Quá hạn' : `Ưu tiên ${PRIORITY_META[c.priority].label.toLowerCase()}`}
        </span>
        {/* Touch devices can't use HTML5 drag-and-drop — offer an explicit status picker there. */}
        <select
          aria-label="Chuyển trạng thái"
          value={c.status}
          onChange={(e) => onMove(e.target.value as ContentStatus)}
          className="hidden h-7 max-w-28 rounded border border-line bg-surface text-xs [@media(pointer:coarse)]:block"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
