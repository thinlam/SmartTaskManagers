import { useState } from 'react';
import { Download } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api/client';
import { STATUSES, type ReportSummary } from '../api/types';
import {
  Button,
  Card,
  ErrorState,
  PageHeader,
  ProgressBar,
  SectionTitle,
  Select,
  Spinner,
} from '../components/ui';
import { SaveCancelled, downloadCsv } from '../lib/format';
import { STATUS_META } from '../lib/meta';
import { errMsg, useAsync, useToast } from '../state/AppState';

const RANGES = [
  { v: '7', label: '7 ngày qua' },
  { v: '30', label: '30 ngày qua' },
  { v: '90', label: '90 ngày qua' },
  { v: 'all', label: 'Toàn bộ thời gian' },
];

const STATUS_COLOR: Record<string, string> = {
  Idea: '#7c3aed',
  Drafting: '#2563eb',
  Review: '#d97706',
  Approved: '#16a34a',
  Scheduled: '#0ea5e9',
  Published: '#94a3b8',
};

export function ReportsPage() {
  const toast = useToast();
  const [range, setRange] = useState('30');
  const { data, error, loading, reload } = useAsync(
    () =>
      api.reports({
        from:
          range === 'all'
            ? undefined
            : new Date(Date.now() - Number(range) * 86400000).toISOString(),
      }),
    [range],
  );

  const [exporting, setExporting] = useState(false);
  const exportCsv = async (d: ReportSummary) => {
    setExporting(true);
    try {
      const label = RANGES.find((r) => r.v === range)?.label ?? '';
      const message = await downloadCsv(
        `bao-cao-noi-dung-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          ['Báo cáo nội dung', label],
          [],
          ['Tổng nội dung', d.total],
          ['Đã đăng', d.published],
          ['Tỷ lệ hoàn thành (%)', d.completionRate],
          [],
          ['Nhóm', 'Tên', 'Tổng', 'Đã đăng'],
          ...d.byStatus.map((x) => ['Trạng thái', STATUS_META[x.status].label, x.count, '']),
          ...d.byChannel.map((x) => ['Kênh', x.channel, x.count, x.published]),
          ...d.byAssignee.map((x) => ['Người phụ trách', x.name, x.count, x.published]),
          ...d.byCampaign.map((x) => ['Chiến dịch', x.name, x.count, x.published]),
        ],
      );
      toast.success(message);
    } catch (e) {
      if (!(e instanceof SaveCancelled)) toast.error(`Không xuất được báo cáo: ${errMsg(e)}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Báo cáo"
        subtitle="Hiệu suất sản xuất nội dung theo kênh, người phụ trách và chiến dịch"
        actions={
          <>
            <Select
              className="w-48"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              aria-label="Khoảng thời gian"
            >
              {RANGES.map((r) => (
                <option key={r.v} value={r.v}>
                  {r.label}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              icon={<Download className="h-4 w-4" />}
              disabled={!data}
              loading={exporting}
              onClick={() => data && void exportCsv(data)}
            >
              Xuất CSV
            </Button>
          </>
        }
      />

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <Spinner />
      ) : (
        data && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ['Tổng nội dung', data.total],
                ['Đã đăng', data.published],
                ['Tỷ lệ hoàn thành', `${data.completionRate}%`],
              ].map(([l, v]) => (
                <Card key={l} className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">
                    {l}
                  </p>
                  <p className="mt-1 text-3xl font-bold">{v}</p>
                </Card>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="p-5">
                <SectionTitle>Theo trạng thái</SectionTitle>
                {data.total === 0 ? (
                  <p className="py-10 text-center text-sm text-ink-3">
                    Chưa có dữ liệu trong khoảng này.
                  </p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={STATUSES.map((s) => ({
                            name: STATUS_META[s].label,
                            key: s,
                            value: data.byStatus.find((b) => b.status === s)?.count ?? 0,
                          })).filter((x) => x.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={2}
                        >
                          {STATUSES.map((s) => (
                            <Cell key={s} fill={STATUS_COLOR[s]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <SectionTitle>Theo kênh</SectionTitle>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.byChannel.map((c) => ({
                        name: c.channel,
                        total: c.count,
                        published: c.published,
                      }))}
                      margin={{ left: -20, right: 4, top: 8 }}
                    >
                      <CartesianGrid vertical={false} stroke="var(--color-line)" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                      />
                      <Tooltip cursor={{ fill: 'var(--color-sunken)' }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="total"
                        name="Tổng"
                        fill="var(--color-brand)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="published"
                        name="Đã đăng"
                        fill="var(--color-ok)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Breakdown title="Theo người phụ trách" rows={data.byAssignee} />
              <Breakdown title="Theo chiến dịch" rows={data.byCampaign} />
            </div>
          </div>
        )
      )}
    </>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; count: number; published: number }[];
}) {
  return (
    <Card className="p-5">
      <SectionTitle>{title}</SectionTitle>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-3">Chưa có dữ liệu.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.name}>
              <div className="mb-1 flex justify-between gap-2 text-sm">
                <span className="truncate font-medium">{r.name}</span>
                <span className="shrink-0 text-ink-2">
                  {r.published}/{r.count} đã đăng
                </span>
              </div>
              <ProgressBar value={r.count ? (r.published / r.count) * 100 : 0} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
