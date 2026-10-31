import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarX, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { api } from '../api/client';
import { CHANNELS, type Content } from '../api/types';
import {
  Button,
  Card,
  ChannelIcon,
  EmptyState,
  ErrorState,
  PageHeader,
  StatusBadge,
} from '../components/ui';
import { cn, fmtTime, sameDay } from '../lib/format';
import { CHANNEL_META } from '../lib/meta';
import { getPrefs } from '../lib/prefs';
import { useAsync, usePermissions } from '../state/AppState';

type View = 'month' | 'week' | 'list';
const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mondayOf = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const toDateParam = (d: Date, hour = 9) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour).toISOString();

export function CalendarPage() {
  const navigate = useNavigate();
  const { canEdit } = usePermissions();
  const today = startOfDay(new Date());
  const [view, setView] = useState<View>(getPrefs().calendarView);
  const [cursor, setCursor] = useState(today);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const { rangeStart, rangeEnd, days } = useMemo(() => {
    if (view === 'week') {
      const s = mondayOf(cursor);
      return {
        rangeStart: s,
        rangeEnd: addDays(s, 7),
        days: Array.from({ length: 7 }, (_, i) => addDays(s, i)),
      };
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const s = mondayOf(first);
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const weeks = Math.ceil((((next.getTime() - s.getTime()) / 86400000) | 0) / 7);
    return {
      rangeStart: s,
      rangeEnd: addDays(s, weeks * 7),
      days: Array.from({ length: weeks * 7 }, (_, i) => addDays(s, i)),
    };
  }, [view, cursor]);

  const { data, error, reload } = useAsync(
    () =>
      api.contents.list({
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
        sort: 'scheduled',
        pageSize: 500,
      }),
    [rangeStart.getTime(), rangeEnd.getTime()],
  );
  const upcoming = useAsync(
    () => api.contents.list({ from: new Date().toISOString(), sort: 'scheduled', pageSize: 12 }),
    [],
  );

  const visible = (data?.items ?? []).filter((c) => !hidden.has(c.channel));
  const byDay = (d: Date) =>
    visible.filter((c) => c.scheduledAt && sameDay(new Date(c.scheduledAt), d));

  const step = (dir: -1 | 1) =>
    setCursor((c) =>
      view === 'week' ? addDays(c, 7 * dir) : new Date(c.getFullYear(), c.getMonth() + dir, 1),
    );

  const title =
    view === 'week'
      ? `${days[0]!.getDate()}/${days[0]!.getMonth() + 1} – ${days[6]!.getDate()}/${days[6]!.getMonth() + 1}/${days[6]!.getFullYear()}`
      : `Tháng ${cursor.getMonth() + 1}, ${cursor.getFullYear()}`;

  const create = (d: Date) => navigate(`/contents/new?date=${encodeURIComponent(toDateParam(d))}`);
  const next = (upcoming.data?.items ?? []).filter((c) => c.status !== 'Published').slice(0, 5);

  return (
    <>
      <PageHeader title="Lịch đăng bài" />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            className="w-10 px-0"
            aria-label="Kỳ trước"
            onClick={() => step(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-40 px-3 text-center text-lg font-bold">{title}</span>
          <Button
            variant="secondary"
            className="w-10 px-0"
            aria-label="Kỳ sau"
            onClick={() => step(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="secondary" onClick={() => setCursor(today)}>
          Hôm nay
        </Button>
        <div className="ml-auto inline-flex rounded-md border border-line bg-surface p-0.5 text-sm font-semibold">
          {(
            [
              ['month', 'Tháng'],
              ['week', 'Tuần'],
              ['list', 'Danh sách'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                'h-9 cursor-pointer rounded-sm px-3',
                view === v ? 'bg-brand text-white' : 'text-ink-2 hover:text-ink',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2" role="group" aria-label="Lọc theo kênh">
        {CHANNELS.map((ch) => {
          const off = hidden.has(ch);
          return (
            <button
              key={ch}
              type="button"
              aria-pressed={!off}
              onClick={() =>
                setHidden((h) => {
                  const n = new Set(h);
                  if (n.has(ch)) n.delete(ch);
                  else n.add(ch);
                  return n;
                })
              }
              className={cn('flex cursor-pointer items-center gap-2 text-sm', off && 'opacity-40')}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: CHANNEL_META[ch].color }}
              />
              {ch}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card className="min-w-0 overflow-hidden">
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : view === 'list' ? (
            <ListView
              days={days.filter((d) => view !== 'list' || d.getMonth() === cursor.getMonth())}
              byDay={byDay}
              onOpen={(c) => navigate(`/contents/${c.id}`)}
            />
          ) : (
            <div className="overflow-x-auto">
              <div className={cn('min-w-[640px]')}>
                <div className="grid grid-cols-7 border-b border-line bg-canvas text-center text-xs font-semibold text-ink-2">
                  {DOW.map((d) => (
                    <div key={d} className="py-3">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {days.map((d, i) => {
                    const items = byDay(d);
                    const isToday = sameDay(d, today);
                    const outside = view === 'month' && d.getMonth() !== cursor.getMonth();
                    return (
                      <div
                        key={i}
                        className={cn(
                          'group relative border-b border-r border-line p-1.5',
                          view === 'week' ? 'min-h-72' : 'min-h-28',
                          outside && 'bg-canvas/60',
                          (i + 1) % 7 === 0 && 'border-r-0',
                        )}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span
                            className={cn(
                              'flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold',
                              isToday ? 'bg-brand text-white' : outside ? 'text-ink-3' : 'text-ink',
                            )}
                          >
                            {d.getDate()}
                          </span>
                          {canEdit && (
                            <button
                              type="button"
                              aria-label={`Thêm nội dung ngày ${d.getDate()}/${d.getMonth() + 1}`}
                              onClick={() => create(d)}
                              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-ink-3 opacity-0 hover:bg-sunken group-hover:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-1">
                          {items.slice(0, view === 'week' ? 20 : 3).map((c) => (
                            <EventChip
                              key={c.id}
                              c={c}
                              onOpen={() => navigate(`/contents/${c.id}`)}
                            />
                          ))}
                          {view === 'month' && items.length > 3 && (
                            <button
                              type="button"
                              onClick={() => {
                                setCursor(d);
                                setView('week');
                              }}
                              className="cursor-pointer px-1 text-[11px] font-semibold text-brand hover:underline"
                            >
                              +{items.length - 3} nữa
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="h-fit p-5">
          <h2 className="mb-4 text-lg font-bold">Lịch sắp tới</h2>
          {next.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">Chưa có bài nào sắp đăng.</p>
          ) : (
            <ul className="space-y-4">
              {next.map((c) => {
                const d = new Date(c.scheduledAt!);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/contents/${c.id}`)}
                      className="flex w-full cursor-pointer gap-3 text-left"
                    >
                      <div className="w-10 shrink-0 text-center">
                        <p className="text-xl font-bold leading-none">{d.getDate()}</p>
                        <p className="text-[11px] text-ink-3">Th{d.getMonth() + 1}</p>
                      </div>
                      <ChannelIcon channel={c.channel} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-ink-2">
                          {fmtTime(c.scheduledAt!)}
                        </p>
                        <p className="line-clamp-2 text-sm font-semibold leading-snug">{c.title}</p>
                        <div className="mt-1">
                          <StatusBadge status={c.status} />
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function EventChip({ c, onOpen }: { c: Content; onOpen: () => void }) {
  const color = CHANNEL_META[c.channel].color;
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${fmtTime(c.scheduledAt!)} · ${c.title}`}
      className="flex w-full cursor-pointer items-start gap-1.5 rounded-sm px-1.5 py-1 text-left text-[11px] font-medium leading-tight hover:brightness-95"
      style={{ background: `${color}14`, color: 'var(--color-ink)' }}
    >
      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <span className="line-clamp-2">{c.title}</span>
    </button>
  );
}

function ListView({
  days,
  byDay,
  onOpen,
}: {
  days: Date[];
  byDay: (d: Date) => Content[];
  onOpen: (c: Content) => void;
}) {
  const filled = days.map((d) => ({ d, items: byDay(d) })).filter((x) => x.items.length);
  if (!filled.length)
    return (
      <EmptyState
        icon={<CalendarX className="h-8 w-8" />}
        title="Không có bài nào trong khoảng thời gian này"
      />
    );
  return (
    <ul className="divide-y divide-line">
      {filled.map(({ d, items }) => (
        <li key={d.toISOString()} className="p-4">
          <p className="mb-2 text-sm font-bold">
            {DOW[(d.getDay() + 6) % 7]}, {d.getDate()}/{d.getMonth() + 1}
          </p>
          <ul className="space-y-2">
            {items.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onOpen(c)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-line p-2.5 text-left hover:bg-canvas"
                >
                  <ChannelIcon channel={c.channel} size={28} />
                  <span className="w-12 shrink-0 text-xs font-semibold text-ink-2">
                    {fmtTime(c.scheduledAt!)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.title}</span>
                  <StatusBadge status={c.status} />
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
