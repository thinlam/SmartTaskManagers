import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  FileText,
  PencilLine,
  Target,
  TimerOff,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api/client';
import { CHANNELS, type Content, type Kpi } from '../api/types';
import {
  Avatar,
  Card,
  ChannelIcon,
  ErrorState,
  PageHeader,
  SectionTitle,
  Select,
  Spinner,
  StatusBadge,
} from '../components/ui';
import { activityText } from '../lib/activity';
import { cn, fmtDate, fmtRelativeDay, fmtTime, sameDay, timeAgo } from '../lib/format';
import { useAsync, useLookups } from '../state/AppState';

function Delta({ kpi, label, invert }: { kpi: Kpi; label: string; invert?: boolean }) {
  const d = kpi.deltaPercent;
  if (d === null || d === undefined) return <span className="text-xs text-ink-3">—</span>;
  const up = d > 0;
  const good = d === 0 ? null : invert ? !up : up;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <p className="flex flex-wrap items-center gap-1 text-xs text-ink-2">
      {d !== 0 && (
        <span
          className={cn('inline-flex items-center font-semibold', good ? 'text-ok' : 'text-bad')}
        >
          <Icon className="h-3 w-3" />
          {Math.abs(d)}%
        </span>
      )}
      <span>
        {d === 0 ? 'Không đổi' : ''} {label}
      </span>
    </p>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { members } = useLookups();
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [channel, setChannel] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  const { data, error, loading, reload } = useAsync(
    () =>
      api.dashboard({ range, channel: channel || undefined, assigneeId: assigneeId || undefined }),
    [range, channel, assigneeId],
  );

  const vs = range === 'week' ? 'so với tuần trước' : 'so với tháng trước';

  const tiles = data && [
    {
      label: 'Tổng nội dung',
      kpi: data.kpis.total,
      icon: FileText,
      tone: 'text-brand bg-brand-soft',
    },
    { label: 'Đã đăng', kpi: data.kpis.published, icon: CheckCircle2, tone: 'text-ok bg-ok-soft' },
    {
      label: 'Đang soạn',
      kpi: data.kpis.drafting,
      icon: PencilLine,
      tone: 'text-brand bg-brand-soft',
    },
    { label: 'Chờ duyệt', kpi: data.kpis.review, icon: Clock3, tone: 'text-warn bg-warn-soft' },
    {
      label: 'Quá hạn',
      kpi: data.kpis.overdue,
      icon: TimerOff,
      tone: 'text-bad bg-bad-soft',
      invert: true,
    },
    {
      label: 'Tỷ lệ hoàn thành',
      kpi: data.kpis.completionRate,
      icon: Target,
      tone: 'text-violet bg-violet-soft',
      suffix: '%',
    },
  ];

  return (
    <>
      <PageHeader title="Tổng quan" subtitle="Theo dõi tiến độ nội dung và lịch đăng của đội ngũ" />

      <div className="mb-5 flex flex-wrap gap-2">
        <div className="inline-flex rounded-md border border-line bg-surface p-1 text-sm font-semibold">
          {(['week', 'month'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                'h-8 cursor-pointer rounded-sm px-4 transition',
                range === r ? 'bg-brand-soft text-brand' : 'text-ink-2 hover:text-ink',
              )}
            >
              {r === 'week' ? 'Tuần' : 'Tháng'}
            </button>
          ))}
        </div>
        <Select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          aria-label="Lọc theo kênh"
          className="w-40"
        >
          <option value="">Tất cả kênh</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          aria-label="Lọc theo người phụ trách"
          className="w-48"
        >
          <option value="">Người phụ trách</option>
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
        data &&
        tiles && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {tiles.map(({ label, kpi, icon: Icon, tone, invert, suffix }) => (
                <Card key={label} className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
                        tone,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">
                        {label}
                      </p>
                      <p className="mt-0.5 text-3xl font-bold leading-none">
                        {kpi.value}
                        {suffix}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Delta kpi={kpi} label={vs} invert={invert} />
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
              <Card className="p-5">
                <SectionTitle
                  action={
                    <Link to="/contents" className="text-sm font-medium text-brand hover:underline">
                      Xem tất cả ({data.focus.count})
                    </Link>
                  }
                >
                  Tập trung hôm nay
                </SectionTitle>
                {data.focus.items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-3">
                    Không có nội dung nào cần xử lý hôm nay.
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.focus.items.map((c) => (
                      <FocusRow key={c.id} c={c} onOpen={() => navigate(`/contents/${c.id}`)} />
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-5">
                <SectionTitle
                  action={
                    <Link to="/calendar" className="text-sm font-medium text-brand hover:underline">
                      Xem tất cả
                    </Link>
                  }
                >
                  Sắp đến hạn đăng
                </SectionTitle>
                {data.upcoming.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-3">Chưa có bài nào lên lịch.</p>
                ) : (
                  <ul className="space-y-4">
                    {data.upcoming.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/contents/${c.id}`)}
                          className="flex w-full cursor-pointer items-center gap-3 text-left"
                        >
                          <ChannelIcon channel={c.channel} size={36} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{c.title}</p>
                            <p className="truncate text-xs text-ink-3">
                              {c.channel} • {c.assignee?.fullName ?? 'Chưa giao'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right text-xs">
                            <p
                              className={cn(
                                'font-semibold',
                                c.scheduledAt && sameDay(new Date(c.scheduledAt), new Date())
                                  ? 'text-bad'
                                  : 'text-ink-2',
                              )}
                            >
                              {c.scheduledAt && sameDay(new Date(c.scheduledAt), new Date())
                                ? 'Hôm nay'
                                : fmtDate(c.scheduledAt)}
                            </p>
                            <p className="text-ink-3">
                              {c.scheduledAt ? fmtTime(c.scheduledAt) : ''}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1fr]">
              <Card className="p-5">
                <SectionTitle>Nội dung theo kênh</SectionTitle>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={CHANNELS.map((ch) => ({
                        name: ch,
                        count: data.byChannel.find((b) => b.channel === ch)?.count ?? 0,
                      }))}
                      margin={{ top: 16, right: 4, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="var(--color-line)" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--color-sunken)' }}
                        formatter={(v) => [v, 'Nội dung']}
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--color-brand)"
                        radius={[6, 6, 0, 0]}
                        label={{ position: 'top', fontSize: 12 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex justify-between px-4">
                  {CHANNELS.map((c) => (
                    <ChannelIcon key={c} channel={c} size={22} />
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <SectionTitle>Created vs Published theo tuần</SectionTitle>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.weekly.map((w) => ({ ...w, name: w.label.split('|')[0] }))}
                      margin={{ top: 16, right: 12, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="var(--color-line)" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                      />
                      <Tooltip
                        labelFormatter={(_, p) => p?.[0]?.payload?.label?.replace('|', ' (') + ')'}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="plainline"
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="created"
                        name="Created"
                        stroke="var(--color-brand)"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="published"
                        name="Published"
                        stroke="var(--color-ok)"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5 lg:col-span-2 xl:col-span-1">
                <SectionTitle>Hoạt động gần đây</SectionTitle>
                {data.activities.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-3">Chưa có hoạt động nào.</p>
                ) : (
                  <ul className="space-y-4">
                    {data.activities.map((a) => (
                      <li key={a.id} className="flex gap-3">
                        <Avatar name={a.user?.fullName ?? '?'} />
                        <div className="min-w-0">
                          <p className="text-sm leading-snug">{activityText(a)}</p>
                          <p className="text-xs text-ink-3">{timeAgo(a.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        )
      )}
    </>
  );
}

function FocusRow({ c, onOpen }: { c: Content; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 py-3 text-left"
      >
        <ChannelIcon channel={c.channel} size={32} />
        <span className="min-w-0 flex-1 basis-48 truncate text-sm font-medium">{c.title}</span>
        <span className="flex items-center gap-2 text-sm text-ink-2">
          <Avatar name={c.assignee?.fullName ?? '?'} size="sm" />
          <span className="hidden sm:inline">{c.assignee?.fullName ?? 'Chưa giao'}</span>
        </span>
        <span
          className={cn(
            'text-sm',
            c.scheduledAt && new Date(c.scheduledAt).getTime() < Date.now()
              ? 'font-semibold text-bad'
              : 'text-ink-2',
          )}
        >
          {fmtRelativeDay(c.scheduledAt)}
        </span>
        <StatusBadge status={c.status} />
      </button>
    </li>
  );
}
